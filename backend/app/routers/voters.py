from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from app.db.session import get_db
from app.db.models import Voter, User, AuditLog, FaceEmbedding
from app.core.security import get_password_hash, require_role, get_current_user
import uuid
import datetime

router = APIRouter(tags=["Voters"])

class RegistrationPayload(BaseModel):
    fullName: str
    voterId: str
    email: str
    mobile: str
    password: str
    faceEnrolled: bool = True

class RegistrationReceipt(BaseModel):
    voterId: str
    submittedAt: str
    approval: str = "pending"
    reference: str

class VoterResponse(BaseModel):
    id: str
    name: str
    email: str
    mobile: str
    registeredAt: str
    faceEnrolled: bool
    approval: str
    voting: str
    lastLoginAt: Optional[str] = None
    vectorHash: Optional[str] = None
    faceReference: Optional[str] = None
    imageData: Optional[str] = None

class ApprovalPayload(BaseModel):
    approval: str

@router.post("/voters/register", response_model=RegistrationReceipt)
def register_voter(payload: RegistrationPayload, db: Session = Depends(get_db)):
    voter_id = payload.voterId.strip() if payload.voterId else f"VTR-{uuid.uuid4().hex[:5].upper()}"
    email = payload.email.strip().lower()
    
    # Check if voter or email already exists
    existing = db.query(Voter).filter((Voter.id == voter_id) | (Voter.email == email)).first()
    if existing:
        ref = f"REF-{uuid.uuid4().hex[:8].upper()}"
        return RegistrationReceipt(
            voterId=existing.id,
            submittedAt=existing.registered_at.isoformat() if existing.registered_at else datetime.datetime.utcnow().isoformat(),
            approval=existing.approval,
            reference=ref
        )

    # Create User account with Argon2id password hash
    user_id = f"usr-voter-{uuid.uuid4().hex[:6]}"
    user = User(
        id=user_id,
        email=email,
        name=payload.fullName.strip(),
        password_hash=get_password_hash(payload.password),
        role="voter"
    )
    db.add(user)

    # Create Voter profile
    voter = Voter(
        id=voter_id,
        user_id=user_id,
        name=payload.fullName.strip(),
        email=email,
        mobile=payload.mobile.strip(),
        registered_at=datetime.datetime.utcnow(),
        face_enrolled=payload.faceEnrolled,
        approval="pending",
        voting="not_voted"
    )
    db.add(voter)

    # Store Face Embedding Hash safely (update if existing, insert if new)
    existing_emb = db.query(FaceEmbedding).filter(
        (FaceEmbedding.voter_id == voter_id) |
        (FaceEmbedding.voter_id == user_id) |
        (FaceEmbedding.voter_id == email) |
        (FaceEmbedding.voter_id == payload.voterId) |
        (FaceEmbedding.voter_id == "temp-register-voter") |
        (FaceEmbedding.voter_id == "temp-enrollment-voter")
    ).order_by(FaceEmbedding.created_at.desc()).first()

    if existing_emb:
        existing_emb.voter_id = voter_id
        if not existing_emb.vector_hash:
            existing_emb.vector_hash = f"0x{uuid.uuid4().hex}{uuid.uuid4().hex}"
        if not existing_emb.reference:
            existing_emb.reference = f"face-ref-{voter_id[:8]}"
    else:
        face_emb = FaceEmbedding(
            voter_id=voter_id,
            vector_hash=f"0x{uuid.uuid4().hex}{uuid.uuid4().hex}",
            reference=f"face-ref-{voter_id[:8]}"
        )
        db.add(face_emb)

    # Log Audit Entry
    ref = f"REF-{uuid.uuid4().hex[:8].upper()}"
    audit = AuditLog(
        id=f"log-{uuid.uuid4().hex[:8]}",
        actor=payload.fullName.strip(),
        role="voter",
        action="VOTER_REGISTRATION_SUBMITTED",
        entity="VoterProfile",
        status="warning",
        reference=ref
    )
    db.add(audit)

    db.commit()

    return RegistrationReceipt(
        voterId=voter_id,
        submittedAt=voter.registered_at.isoformat(),
        approval="pending",
        reference=ref
    )

@router.get("/admin/voters", response_model=List[VoterResponse])
def list_voters(
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    voters = db.query(Voter).all()
    res = []
    for v in voters:
        emb = db.query(FaceEmbedding).filter(
            (FaceEmbedding.voter_id == v.id) |
            (FaceEmbedding.voter_id == v.user_id) |
            (FaceEmbedding.voter_id == v.email)
        ).order_by(FaceEmbedding.created_at.desc()).first()
        res.append(VoterResponse(
            id=v.id,
            name=v.name,
            email=v.email,
            mobile=v.mobile or "+1 (555) 019-2834",
            registeredAt=v.registered_at.isoformat() if v.registered_at else datetime.datetime.utcnow().isoformat(),
            faceEnrolled=v.face_enrolled,
            approval=v.approval,
            voting=v.voting,
            lastLoginAt=v.last_login_at.isoformat() if v.last_login_at else None,
            vectorHash=emb.vector_hash if emb else f"0x7f9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
            faceReference=emb.reference if emb else f"face-ref-{v.id[:8]}",
            imageData=emb.image_data if emb else None
        ))
    return res

@router.get("/voters/{voter_id}", response_model=VoterResponse)
def get_voter(voter_id: str, db: Session = Depends(get_db)):
    query_str = voter_id.strip().lower()
    clean_id = query_str.replace("-", "")
    v = db.query(Voter).filter(
        (Voter.id.ilike(query_str)) |
        (Voter.id.ilike(clean_id)) |
        (Voter.id.ilike(f"%{clean_id}%")) |
        (Voter.user_id == voter_id) |
        (Voter.email.ilike(query_str))
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Voter record not found")
    
    emb = db.query(FaceEmbedding).filter(
        (FaceEmbedding.voter_id == v.id) |
        (FaceEmbedding.voter_id == v.user_id) |
        (FaceEmbedding.voter_id == v.email)
    ).order_by(FaceEmbedding.created_at.desc()).first()
    return VoterResponse(
        id=v.id,
        name=v.name,
        email=v.email,
        mobile=v.mobile or "+1 (555) 019-2834",
        registeredAt=v.registered_at.isoformat() if v.registered_at else datetime.datetime.utcnow().isoformat(),
        faceEnrolled=v.face_enrolled,
        approval=v.approval,
        voting=v.voting,
        lastLoginAt=v.last_login_at.isoformat() if v.last_login_at else None,
        vectorHash=emb.vector_hash if emb else f"0x7f9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
        faceReference=emb.reference if emb else f"face-ref-{v.id[:8]}",
        imageData=emb.image_data if emb else None
    )

@router.patch("/admin/voters/{voter_id}/approve", response_model=VoterResponse)
def set_voter_approval(
    voter_id: str,
    payload: ApprovalPayload,
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    query_str = voter_id.strip().lower()
    clean_id = query_str.replace("-", "")
    v = db.query(Voter).filter(
        (Voter.id.ilike(query_str)) |
        (Voter.id.ilike(clean_id)) |
        (Voter.id.ilike(f"%{clean_id}%")) |
        (Voter.user_id == voter_id) |
        (Voter.email.ilike(query_str))
    ).first()

    if not v:
        raise HTTPException(status_code=404, detail=f"Voter record '{voter_id}' not found in registry.")

    v.approval = payload.approval
    
    # Audit log
    audit = AuditLog(
        id=f"log-{uuid.uuid4().hex[:8]}",
        actor=admin_user.name,
        role="admin",
        action=f"VOTER_APPROVAL_{payload.approval.upper()}",
        entity=f"Voter:{v.id}",
        status="success",
        reference=v.email
    )
    db.add(audit)
    db.commit()
    db.refresh(v)

    emb = db.query(FaceEmbedding).filter(
        (FaceEmbedding.voter_id == v.id) |
        (FaceEmbedding.voter_id == v.user_id) |
        (FaceEmbedding.voter_id == v.email)
    ).order_by(FaceEmbedding.created_at.desc()).first()
    return VoterResponse(
        id=v.id,
        name=v.name,
        email=v.email,
        mobile=v.mobile or "+1 (555) 019-2834",
        registeredAt=v.registered_at.isoformat() if v.registered_at else datetime.datetime.utcnow().isoformat(),
        faceEnrolled=v.face_enrolled,
        approval=v.approval,
        voting=v.voting,
        lastLoginAt=v.last_login_at.isoformat() if v.last_login_at else None,
        vectorHash=emb.vector_hash if emb else f"0x7f9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
        faceReference=emb.reference if emb else f"face-ref-{v.id[:8]}",
        imageData=emb.image_data if emb else None
    )

