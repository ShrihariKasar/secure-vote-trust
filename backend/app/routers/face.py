import uuid
import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.db.models import FaceEmbedding, AuditLog, VotingSession, Voter, User
from app.services.face_service import face_service
from app.core.security import get_current_user
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enrolls facial landmark representation for current user.
    Biometric embeddings are kept server-side and never returned in public APIs.
    """
    voter_id = current_user.id
    vector_hash, reference = face_service.enroll_face(voter_id, payload.imageData)
    
    existing = db.query(FaceEmbedding).filter(FaceEmbedding.voter_id == voter_id).first()
    if existing:
        existing.vector_hash = vector_hash
        existing.reference = reference
    else:
        emb = FaceEmbedding(
            voter_id=voter_id,
            vector_hash=vector_hash,
            reference=reference
        )
        db.add(emb)

    voter = db.query(Voter).filter((Voter.user_id == current_user.id) | (Voter.id == current_user.id)).first()
    if voter:
        voter.face_enrolled = True

    # Audit log
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Performs authoritative backend facial verification & liveness detection.
    Upon success, creates a short-lived voting authorization session.
    """
    # Authoritative user identification from token context
    voter_id = current_user.id
    voter = db.query(Voter).filter((Voter.user_id == current_user.id) | (Voter.id == current_user.id)).first()
    voter_ref_id = voter.id if voter else current_user.id

    # Retrieve stored face embedding hash
    emb = db.query(FaceEmbedding).filter(FaceEmbedding.voter_id == voter_ref_id).first()
    stored_hash = emb.vector_hash if emb else "0x_default_enrolled_embedding_hash"

    result = face_service.verify_face(voter_ref_id, stored_hash, payload.imageData)

    if not result["verified"]:
        audit = AuditLog(
            id=f"log-{uuid.uuid4().hex[:8]}",
            actor=current_user.name,
            role=current_user.role,
            action="FACE_VERIFICATION_FAILURE",
            entity="FaceSensor",
            status="failure",
            reference=result["reference"]
        )
        db.add(audit)
        db.commit()
        raise HTTPException(status_code=401, detail="Facial biometric verification or liveness check failed.")

    # Create short-lived secure VotingSession token (valid for 15 mins)
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

    # Log Audit
    audit = AuditLog(
        id=f"log-{uuid.uuid4().hex[:8]}",
        actor=current_user.name,
        role=current_user.role,
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

