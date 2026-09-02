from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.db.session import get_db
from app.db.models import Voter, User, AuditLog, FaceEmbedding
from app.core.security import get_password_hash
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

class ApprovalPayload(BaseModel):
    approval: str

@router.post("/voters/register", response_model=RegistrationReceipt)
def register_voter(payload: RegistrationPayload, db: Session = Depends(get_db)):
    voter_id = payload.voterId or f"VTR-{uuid.uuid4().hex[:5].upper()}"
    
    # Check if voter already exists
    existing = db.query(Voter).filter((Voter.id == voter_id) | (Voter.email == payload.email)).first()
    if existing:
        ref = f"REF-{uuid.uuid4().hex[:8]}"
        return RegistrationReceipt(
            voterId=existing.id,
            submittedAt=existing.registered_at.isoformat(),
            approval=existing.approval,
            reference=ref
        )

    # Create User account
    user_id = f"usr-voter-{uuid.uuid4().hex[:4]}"
    user = User(
        id=user_id,
        email=payload.email,
        name=payload.fullName,
        password_hash=get_password_hash(payload.password),
        role="voter"
    )
    db.add(user)

    # Create Voter profile
    voter = Voter(
        id=voter_id,
        user_id=user_id,
        name=payload.fullName,
        email=payload.email,
        mobile=payload.mobile,
        registered_at=datetime.datetime.utcnow(),
        face_enrolled=payload.faceEnrolled,
        approval="pending",
        voting="not_voted"
    )
    db.add(voter)

    # Store Face Embedding Hash
    face_emb = FaceEmbedding(
        voter_id=voter_id,
        vector_hash=f"0x{uuid.uuid4().hex}{uuid.uuid4().hex}",
        reference=f"face-ref-{voter_id}"
    )
    db.add(face_emb)

    # Log Audit
    ref = f"REF-{uuid.uuid4().hex[:8]}"
    audit = AuditLog(
        id=f"log-{uuid.uuid4().hex[:8]}",
        actor=payload.fullName,
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
def list_voters(db: Session = Depends(get_db)):
    voters = db.query(Voter).all()
    res = []
    for v in voters:
        res.append(VoterResponse(
            id=v.id,
            name=v.name,
            email=v.email,
            mobile=v.mobile or "+1 (555) 019-2834",
            registeredAt=v.registered_at.isoformat() if v.registered_at else datetime.datetime.utcnow().isoformat(),
            faceEnrolled=v.face_enrolled,
            approval=v.approval,
            voting=v.voting,
            lastLoginAt=v.last_login_at.isoformat() if v.last_login_at else None
        ))
    return res

@router.get("/voters/{voter_id}", response_model=VoterResponse)
def get_voter(voter_id: str, db: Session = Depends(get_db)):
    v = db.query(Voter).filter(Voter.id == voter_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Voter not found")
    return VoterResponse(
        id=v.id,
        name=v.name,
        email=v.email,
        mobile=v.mobile or "+1 (555) 019-2834",
        registeredAt=v.registered_at.isoformat() if v.registered_at else datetime.datetime.utcnow().isoformat(),
        faceEnrolled=v.face_enrolled,
        approval=v.approval,
        voting=v.voting,
        lastLoginAt=v.last_login_at.isoformat() if v.last_login_at else None
    )

@router.patch("/admin/voters/{voter_id}/approve", response_model=VoterResponse)
def set_voter_approval(voter_id: str, payload: ApprovalPayload, db: Session = Depends(get_db)):
    v = db.query(Voter).filter(Voter.id == voter_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Voter not found")

    v.approval = payload.approval
    
    # Audit log
    audit = AuditLog(
        id=f"log-{uuid.uuid4().hex[:8]}",
        actor="Elena Vance",
        role="admin",
        action=f"VOTER_APPROVAL_{payload.approval.upper()}",
        entity=f"Voter:{v.id}",
        status="success",
        reference=v.email
    )
    db.add(audit)
    db.commit()
    db.refresh(v)

    return VoterResponse(
        id=v.id,
        name=v.name,
        email=v.email,
        mobile=v.mobile or "+1 (555) 019-2834",
        registeredAt=v.registered_at.isoformat() if v.registered_at else datetime.datetime.utcnow().isoformat(),
        faceEnrolled=v.face_enrolled,
        approval=v.approval,
        voting=v.voting,
        lastLoginAt=v.last_login_at.isoformat() if v.last_login_at else None
    )
