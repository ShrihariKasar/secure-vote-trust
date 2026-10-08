import uuid
import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.db.models import FaceEmbedding, AuditLog, VotingSession, Voter, User
from app.services.face_service import face_service
from app.core.security import get_current_user, get_optional_user
from app.config import settings

router = APIRouter(prefix="/face", tags=["Face Biometrics"])

class EnrollPayload(BaseModel):
    userId: Optional[str] = None
    samples: int = 10
    imageData: Optional[str] = None

class VerifyPayload(BaseModel):
    userId: Optional[str] = None
    electionId: Optional[str] = None
    imageData: Optional[str] = None

class FaceVerificationResult(BaseModel):
    verified: bool
    livenessChecks: Dict[str, bool]
    reference: str
    votingSessionToken: Optional[str] = None
    expiresAt: Optional[str] = None

@router.post("/enroll")
def enroll_face(
    payload: EnrollPayload,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Enrolls facial landmark representation for current or registering user.
    Biometric embeddings are kept server-side and never returned in public APIs.
    """
    voter_ref_id = current_user.id if current_user else (payload.userId or "temp-enrollment-voter")
    if current_user:
        voter_profile = db.query(Voter).filter((Voter.user_id == current_user.id) | (Voter.id == current_user.id)).first()
        if voter_profile:
            voter_ref_id = voter_profile.id

    vector_hash, reference = face_service.enroll_face(voter_ref_id, payload.imageData)
    
    existing = db.query(FaceEmbedding).filter(
        (FaceEmbedding.voter_id == voter_ref_id) |
        (FaceEmbedding.voter_id == (current_user.id if current_user else "")) |
        (FaceEmbedding.voter_id == (current_user.email if current_user else "")) |
        (FaceEmbedding.voter_id == (payload.userId or ""))
    ).order_by(FaceEmbedding.created_at.desc()).first()

    if existing:
        existing.voter_id = voter_ref_id
        existing.vector_hash = vector_hash
        existing.reference = reference
        if payload.imageData:
            existing.image_data = payload.imageData
    else:
        emb = FaceEmbedding(
            voter_id=voter_ref_id,
            vector_hash=vector_hash,
            reference=reference,
            image_data=payload.imageData
        )
        db.add(emb)

    if current_user:
        voter = db.query(Voter).filter((Voter.user_id == current_user.id) | (Voter.id == current_user.id)).first()
        if voter:
            voter.face_enrolled = True

        audit = AuditLog(
            id=f"log-{uuid.uuid4().hex[:8]}",
            actor=current_user.name,
            role=current_user.role,
            action="FACE_ENROLLMENT_SUCCESS",
            entity="BiometricVault",
            status="success",
            reference=reference
        )
        db.add(audit)
    
    db.commit()

    return {"enrolled": True, "samples": payload.samples, "reference": reference}

@router.post("/verify", response_model=FaceVerificationResult)
def verify_face(
    payload: VerifyPayload,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Performs authoritative backend facial verification & liveness detection.
    Upon success, creates a short-lived voting authorization session.
    """
    if current_user:
        voter = db.query(Voter).filter((Voter.user_id == current_user.id) | (Voter.id == current_user.id)).first()
        voter_ref_id = voter.id if voter else current_user.id
        actor_name = current_user.name
        actor_role = current_user.role
    else:
        voter_ref_id = payload.userId or "usr-voter-01"
        actor_name = "Anonymous Voter"
        actor_role = "voter"

    emb = db.query(FaceEmbedding).filter(FaceEmbedding.voter_id == voter_ref_id).first()
    stored_hash = emb.vector_hash if emb else "0x_default_enrolled_embedding_hash"

    result = face_service.verify_face(voter_ref_id, stored_hash, payload.imageData)

    if not result["verified"]:
        audit = AuditLog(
            id=f"log-{uuid.uuid4().hex[:8]}",
            actor=actor_name,
            role=actor_role,
            action="FACE_VERIFICATION_FAILURE",
            entity="FaceSensor",
            status="failure",
            reference=result["reference"]
        )
        db.add(audit)
        db.commit()
        raise HTTPException(status_code=401, detail="Facial biometric verification or liveness check failed.")

    session_token = f"VOTE-SESS-{uuid.uuid4().hex}"
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.VOTING_SESSION_EXPIRE_MINUTES)
    
    voting_session = VotingSession(
        id=f"sess-{uuid.uuid4().hex[:8]}",
        session_token=session_token,
        voter_id=voter_ref_id,
        election_id=payload.electionId,
        created_at=datetime.datetime.utcnow(),
        expires_at=expires_at,
        is_spent=False
    )
    db.add(voting_session)

    audit = AuditLog(
        id=f"log-{uuid.uuid4().hex[:8]}",
        actor=actor_name,
        role=actor_role,
        action="FACE_VERIFICATION_SUCCESS",
        entity="FaceSensor",
        status="success",
        reference=result["reference"]
    )
    db.add(audit)
    db.commit()

    return FaceVerificationResult(
        verified=True,
        livenessChecks=result["livenessChecks"],
        reference=result["reference"],
        votingSessionToken=session_token,
        expiresAt=expires_at.isoformat()
    )

