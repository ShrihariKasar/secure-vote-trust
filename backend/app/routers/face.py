from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any
from app.db.session import get_db
from app.db.models import FaceEmbedding, AuditLog
from app.services.face_service import face_service
import uuid

router = APIRouter(prefix="/face", tags=["Face Biometrics"])

class EnrollPayload(BaseModel):
    userId: str
    samples: int = 10

class VerifyPayload(BaseModel):
    userId: str

class FaceVerificationResult(BaseModel):
    verified: bool
    livenessChecks: Dict[str, bool]
    reference: str

@router.post("/enroll")
def enroll_face(payload: EnrollPayload, db: Session = Depends(get_db)):
    vector_hash, reference = face_service.enroll_face(payload.userId)
    
    existing = db.query(FaceEmbedding).filter(FaceEmbedding.voter_id == payload.userId).first()
    if existing:
        existing.vector_hash = vector_hash
        existing.reference = reference
    else:
        emb = FaceEmbedding(
            voter_id=payload.userId,
            vector_hash=vector_hash,
            reference=reference
        )
        db.add(emb)
    
    db.commit()
    return {"enrolled": True, "samples": payload.samples}

@router.post("/verify", response_model=FaceVerificationResult)
def verify_face(payload: VerifyPayload, db: Session = Depends(get_db)):
    emb = db.query(FaceEmbedding).filter(FaceEmbedding.voter_id == payload.userId).first()
    stored_hash = emb.vector_hash if emb else "0x_demo_hash"

    result = face_service.verify_face(payload.userId, stored_hash)

    audit = AuditLog(
        id=f"log-{uuid.uuid4().hex[:8]}",
        actor=payload.userId,
        role="voter",
        action="BIOMETRIC_FACE_LIVENESS_VERIFIED",
        entity="FaceSensor",
        status="success" if result["verified"] else "failure",
        reference=result["reference"]
    )
    db.add(audit)
    db.commit()

    return FaceVerificationResult(
        verified=result["verified"],
        livenessChecks=result["livenessChecks"],
        reference=result["reference"]
    )
