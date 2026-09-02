from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.db.session import get_db
from app.db.models import User, Voter, AuditLog
from app.core.security import verify_password, get_password_hash, create_access_token
import uuid
import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])

class Credentials(BaseModel):
    identifier: str
    password: str
    role: str = "voter"

class SessionUser(BaseModel):
    id: str
    name: str
    role: str
    email: str
    faceVerified: bool

@router.post("/login", response_model=SessionUser)
def login(credentials: Credentials, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.email == credentials.identifier) | (User.id == credentials.identifier)
    ).first()
    
    if not user:
        # Auto-create demo user if not existing
        role = credentials.role
        name = "Elena Vance" if role == "admin" else "Dr. Aris Thorne"
        user = User(
            id=credentials.identifier if credentials.identifier.startswith("usr-") else f"usr-{role}-01",
            email=credentials.identifier if "@" in credentials.identifier else f"{role}@securevote.org",
            name=name,
            password_hash=get_password_hash(credentials.password or "password"),
            role=role
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Log audit entry
    log = AuditLog(
        id=f"log-{uuid.uuid4().hex[:8]}",
        actor=user.name,
        role=user.role,
        action="AUTHENTICATION_SUCCESS",
        entity="SessionToken",
        status="success",
        reference=user.email
    )
    db.add(log)
    db.commit()

    return SessionUser(
        id=user.id,
        name=user.name,
        role=user.role,
        email=user.email,
        faceVerified=True if user.role == "voter" else True
    )

@router.post("/demo", response_model=SessionUser)
def login_demo(role: str = "voter", db: Session = Depends(get_db)):
    user_id = "usr-admin-01" if role == "admin" else "usr-voter-01"
    name = "Elena Vance" if role == "admin" else "Dr. Aris Thorne"
    email = "admin@securevote.org" if role == "admin" else "aris.thorne@university.edu"

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(
            id=user_id,
            email=email,
            name=name,
            password_hash=get_password_hash("demo123"),
            role=role
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return SessionUser(
        id=user.id,
        name=user.name,
        role=user.role,
        email=user.email,
        faceVerified=True
    )

@router.get("/me", response_model=SessionUser)
def get_me(db: Session = Depends(get_db)):
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return SessionUser(
        id=user.id,
        name=user.name,
        role=user.role,
        email=user.email,
        faceVerified=True
    )
