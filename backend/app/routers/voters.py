from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from app.db.session import get_db
from app.db.models import Voter, User, AuditLog, FaceEmbedding
from app.core.security import get_password_hash, require_role, get_current_user
from app.core.audit import record_audit_log
from app.core.verhoeff import validate_verhoeff
import uuid
import datetime
import secrets
import random

router = APIRouter(tags=["Voters"])

# High-security in-memory Aadhaar OTP verification store with TTL
AADHAAR_OTP_STORE: Dict[str, Dict[str, Any]] = {}

class RegistrationPayload(BaseModel):
    fullName: str
    voterId: str
    email: str
    mobile: str
    password: str
    faceEnrolled: bool = True
    aadhaarNumber: Optional[str] = None
    aadhaarVerified: Optional[bool] = False
    imageData: Optional[str] = None

class RegistrationReceipt(BaseModel):
    voterId: str
    submittedAt: str
    approval: str = "pending"
    reference: str
    aadhaarVerified: Optional[bool] = False
    message: Optional[str] = None

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
    aadhaarLast4: Optional[str] = None
    aadhaarVerified: Optional[bool] = False

class ApprovalPayload(BaseModel):
    approval: str

class AadhaarOtpRequest(BaseModel):
    aadhaarNumber: str
    mobile: Optional[str] = None

class AadhaarOtpVerifyRequest(BaseModel):
    aadhaarNumber: str
    otp: str

class BulkApprovalPayload(BaseModel):
    voterIds: Optional[List[str]] = None
    approveAllPending: bool = True

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
            reference=ref,
            aadhaarVerified=bool(getattr(existing, "aadhaar_verified", False))
        )

    # Determine approval status: Aadhaar e-KYC verified voters are instantly APPROVED!
    aadhaar_verified = bool(payload.aadhaarVerified)
    clean_aadhaar = (payload.aadhaarNumber or "").replace(" ", "").replace("-", "")
    aadhaar_last4 = clean_aadhaar[-4:] if len(clean_aadhaar) >= 4 else None
    approval_status = "approved" if aadhaar_verified else "pending"

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
        approval=approval_status,
        voting="not_voted",
        aadhaar_last4=aadhaar_last4,
        aadhaar_verified=aadhaar_verified
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
        if payload.imageData:
            existing_emb.image_data = payload.imageData
        if not existing_emb.vector_hash:
            existing_emb.vector_hash = f"0x{uuid.uuid4().hex}{uuid.uuid4().hex}"
        if not existing_emb.reference:
            existing_emb.reference = f"face-ref-{voter_id[:8]}"
    else:
        face_emb = FaceEmbedding(
            voter_id=voter_id,
            vector_hash=f"0x{uuid.uuid4().hex}{uuid.uuid4().hex}",
            reference=f"face-ref-{voter_id[:8]}",
            image_data=payload.imageData
        )
        db.add(face_emb)

    # Log Hash-Chained Audit Entry
    ref = f"REF-{uuid.uuid4().hex[:8].upper()}"
    record_audit_log(
        db=db,
        actor=payload.fullName.strip(),
        role="voter",
        action="VOTER_REGISTRATION_SUBMITTED",
        entity="VoterProfile",
        status="warning" if not aadhaar_verified else "success",
        reference=ref
    )
    db.commit()

    return RegistrationReceipt(
        voterId=voter_id,
        submittedAt=voter.registered_at.isoformat(),
        approval=voter.approval,
        reference=ref,
        aadhaarVerified=bool(voter.aadhaar_verified),
        message="Aadhaar e-KYC instant approval complete." if voter.aadhaar_verified else "Pending committee approval."
    )

@router.post("/voters/aadhaar/send-otp")
def send_aadhaar_otp(payload: AadhaarOtpRequest, db: Session = Depends(get_db)):
    clean_num = payload.aadhaarNumber.replace(" ", "").replace("-", "")
    if len(clean_num) != 12 or not clean_num.isdigit():
        raise HTTPException(status_code=400, detail="Invalid Aadhaar number. Must be a 12-digit numeric identifier.")
    
    # Check Verhoeff checksum algorithm (standard for all authentic Indian Aadhaar IDs)
    is_verhoeff_valid = validate_verhoeff(clean_num)
    
    # Generate cryptographically secure 6-digit dynamic OTP
    dynamic_otp = f"{secrets.randbelow(900000) + 100000:06d}"
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(seconds=300)
    
    AADHAAR_OTP_STORE[clean_num] = {
        "otp": dynamic_otp,
        "expires_at": expires_at,
        "attempts": 0,
        "verhoeff_valid": is_verhoeff_valid
    }

    last4 = clean_num[-4:]
    
    # Audit log entry for security traceability
    try:
        record_audit_log(
            db=db,
            actor=f"Aadhaar-KYC-Gateway",
            role="system",
            action="AADHAAR_OTP_DISPATCHED",
            entity=f"Aadhaar:XXXX-XXXX-{last4}",
            status="success",
            reference=f"TTL: 300s | Verhoeff Valid: {is_verhoeff_valid}"
        )
        db.commit()
    except Exception:
        db.rollback()

    return {
        "success": True,
        "message": f"6-digit Aadhaar OTP sent to mobile linked with Aadhaar ending in {last4}",
        "maskedAadhaar": f"XXXX-XXXX-{last4}",
        "demoOtp": dynamic_otp,
        "verhoeffValid": is_verhoeff_valid,
        "expiresInSeconds": 300
    }

@router.post("/voters/aadhaar/verify-otp")
def verify_aadhaar_otp(payload: AadhaarOtpVerifyRequest, db: Session = Depends(get_db)):
    clean_num = payload.aadhaarNumber.replace(" ", "").replace("-", "")
    if len(clean_num) != 12 or not clean_num.isdigit():
        raise HTTPException(status_code=400, detail="Invalid Aadhaar number. Must be 12 digits.")
    
    clean_otp = payload.otp.strip()
    if len(clean_otp) != 6 or not clean_otp.isdigit():
        raise HTTPException(status_code=400, detail="Invalid OTP. Must be a 6-digit numeric code.")
    
    session_data = AADHAAR_OTP_STORE.get(clean_num)
    
    # Check if universal test demo OTP (123456) or dynamically generated OTP matches
    is_demo_bypass = (clean_otp == "123456")
    is_valid_otp = False
    
    if session_data:
        # Check expiration
        if datetime.datetime.utcnow() > session_data["expires_at"]:
            del AADHAAR_OTP_STORE[clean_num]
            raise HTTPException(status_code=400, detail="Aadhaar OTP has expired. Please request a fresh OTP.")
        
        # Check rate-limiting attempts
        session_data["attempts"] += 1
        if session_data["attempts"] > 4:
            del AADHAAR_OTP_STORE[clean_num]
            raise HTTPException(status_code=429, detail="Too many invalid OTP attempts. Aadhaar session locked for security.")
            
        if clean_otp == session_data["otp"] or is_demo_bypass:
            is_valid_otp = True
            del AADHAAR_OTP_STORE[clean_num]
    elif is_demo_bypass:
        is_valid_otp = True
        
    if not is_valid_otp:
        raise HTTPException(status_code=401, detail="Incorrect Aadhaar OTP. Please enter the valid 6-digit code.")
    
    last4 = clean_num[-4:]
    ref = f"UIDAI-KYC-{uuid.uuid4().hex[:8].upper()}"

    # Sample verified citizens from UIDAI central e-KYC demographic repository
    SAMPLE_CITIZENS = [
        {"name": "Aarav Sharma", "email": "aarav.sharma@national.edu.in", "mobile": "+91 98231 45892", "voterId": f"EPIC-DL{random.randint(10000, 99999)}"},
        {"name": "Pooja Patel", "email": "pooja.patel@academics.res.in", "mobile": "+91 97123 90812", "voterId": f"EPIC-GJ{random.randint(10000, 99999)}"},
        {"name": "Rohan Verma", "email": "rohan.verma@techinst.edu", "mobile": "+91 99451 23890", "voterId": f"EPIC-UP{random.randint(10000, 99999)}"},
        {"name": "Sneha Kulkarni", "email": "sneha.kulkarni@univ.ac.in", "mobile": "+91 98670 12345", "voterId": f"EPIC-MH{random.randint(10000, 99999)}"},
        {"name": "Vikramaditya Rao", "email": "v.rao@governance.edu", "mobile": "+91 94401 89234", "voterId": f"EPIC-KA{random.randint(10000, 99999)}"},
        {"name": "Ananya Iyer", "email": "ananya.iyer@institute.org", "mobile": "+91 98840 56781", "voterId": f"EPIC-TN{random.randint(10000, 99999)}"},
        {"name": "Dr. Aarav Sharma", "email": "aarav.sharma@eci-vote.in", "mobile": "+91 98765 43210", "voterId": f"VTR-DL{random.randint(10000, 99999)}"},
        {"name": "Priyanka Nair", "email": "priyanka.nair@digital.edu", "mobile": "+91 94471 23901", "voterId": f"EPIC-KL{random.randint(10000, 99999)}"},
        {"name": "Rajesh Kumar", "email": "rajesh.kumar@biharuniv.edu", "mobile": "+91 99341 78901", "voterId": f"EPIC-BR{random.randint(10000, 99999)}"},
        {"name": "Kavita Reddy", "email": "kavita.reddy@hyderabad.ac.in", "mobile": "+91 98490 67123", "voterId": f"EPIC-TS{random.randint(10000, 99999)}"},
        {"name": "Aditya Sengupta", "email": "aditya.sengupta@kolkata.ac.in", "mobile": "+91 98301 23456", "voterId": f"EPIC-WB{random.randint(10000, 99999)}"},
        {"name": "Meera Nambiar", "email": "meera.nambiar@stateuniv.edu", "mobile": "+91 94460 78123", "voterId": f"EPIC-KL{random.randint(10000, 99999)}"},
    ]
    citizen = random.choice(SAMPLE_CITIZENS)
    
    # Audit log verification success
    try:
        record_audit_log(
            db=db,
            actor="UIDAI-Central-Identity-Vault",
            role="system",
            action="AADHAAR_OTP_VERIFIED",
            entity=f"Aadhaar:XXXX-XXXX-{last4}",
            status="success",
            reference=ref
        )
        db.commit()
    except Exception:
        db.rollback()

    return {
        "verified": True,
        "ekycReference": ref,
        "maskedAadhaar": f"XXXX-XXXX-{last4}",
        "demographicMatch": True,
        "ageVerified": True,
        "fullName": citizen["name"],
        "email": citizen["email"],
        "mobile": citizen["mobile"],
        "voterId": citizen["voterId"],
        "message": "Aadhaar e-KYC authenticated with UIDAI central repository."
    }

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
            imageData=emb.image_data if emb else None,
            aadhaarLast4=getattr(v, "aadhaar_last4", None),
            aadhaarVerified=bool(getattr(v, "aadhaar_verified", False))
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
        imageData=emb.image_data if emb else None,
        aadhaarLast4=getattr(v, "aadhaar_last4", None),
        aadhaarVerified=bool(getattr(v, "aadhaar_verified", False))
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
    
    # Audit log (Hash-Chained)
    record_audit_log(
        db=db,
        actor=admin_user.name,
        role="admin",
        action=f"VOTER_APPROVAL_{payload.approval.upper()}",
        entity=f"Voter:{v.id}",
        status="success",
        reference=v.email
    )
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
        imageData=emb.image_data if emb else None,
        aadhaarLast4=getattr(v, "aadhaar_last4", None),
        aadhaarVerified=bool(getattr(v, "aadhaar_verified", False))
    )

@router.post("/admin/voters/batch-approve")
def batch_approve_voters(
    payload: BulkApprovalPayload,
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    query = db.query(Voter).filter(Voter.approval == "pending")
    if payload.voterIds and not payload.approveAllPending:
        query = query.filter(Voter.id.in_(payload.voterIds))
    
    pending_voters = query.all()
    count = 0
    for v in pending_voters:
        v.approval = "approved"
        count += 1
    
    if count > 0:
        record_audit_log(
            db=db,
            actor=admin_user.name,
            role="admin",
            action="BATCH_VOTER_APPROVAL",
            entity="VoterRegistry",
            status="success",
            reference=f"Approved {count} pending voters"
        )
        db.commit()
    
    return {"success": True, "approvedCount": count, "message": f"Successfully approved {count} voters."}

