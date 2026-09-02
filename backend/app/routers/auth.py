import uuid
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.db.session import get_db
from app.db.models import User, Voter, AuditLog
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    check_login_lockout,
    record_login_failure,
    reset_login_failures,
    get_current_user
)
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

class Credentials(BaseModel):
    identifier: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "SessionUser"

class SessionUser(BaseModel):
    id: str
    name: str
    role: str
    email: str
    faceVerified: bool = False

TokenResponse.update_forward_refs()

@router.post("/login", response_model=TokenResponse)
def login(credentials: Credentials, db: Session = Depends(get_db)):
    """
    Authenticates user against stored Argon2id hash.
    Enforces login throttling, returns JWT access token.
    """
    identifier = credentials.identifier.strip()
    
    # 1. Throttling / Lockout check
    check_login_lockout(identifier)

    # 2. Look up user by email or ID
    user = db.query(User).filter(
        (User.email == identifier) | (User.id == identifier)
    ).first()
    
    if not user:
        record_login_failure(identifier)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials supplied."
        )

    # 3. Verify Argon2id Password Hash
    if not verify_password(credentials.password, user.password_hash):
        record_login_failure(identifier)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials supplied."
        )

    # Reset failure counter on success
    reset_login_failures(identifier)

    # Check facial enrollment state for voters
    is_face_enrolled = True
    if user.role == "voter":
        voter = db.query(Voter).filter(Voter.user_id == user.id).first()
        if voter:
            is_face_enrolled = voter.face_enrolled
            voter.last_login_at = datetime.datetime.utcnow()

    # 4. Issue Short-Lived JWT Access Token
    access_token = create_access_token(subject=user.id, role=user.role)

    # 5. Record Audit Log
    log = AuditLog(
        id=f"log-{uuid.uuid4().hex[:8]}",
        actor=user.name,
        role=user.role,
        action="VOTER_LOGIN_SUCCESS" if user.role == "voter" else "ADMIN_LOGIN_SUCCESS",
        entity="SessionToken",
        status="success",
        reference=user.email
    )
    db.add(log)
    db.commit()

    session_user = SessionUser(
        id=user.id,
        name=user.name,
        role=user.role,
        email=user.email,
        faceVerified=is_face_enrolled
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=session_user
    )

@router.post("/demo", response_model=TokenResponse)
def login_demo(role: str = "voter", db: Session = Depends(get_db)):
    """
    Demo environment login endpoint. Explicitly enabled via DEMO_MODE setting.
    """
    if not settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="Demo authentication is disabled in production.")

    user_id = "usr-admin-01" if role == "admin" else "usr-voter-01"
    name = "Elena Vance" if role == "admin" else "Dr. Aris Thorne"
    email = "admin@securevote.org" if role == "admin" else "aris.thorne@university.edu"

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(
            id=user_id,
            email=email,
            name=name,
            password_hash=get_password_hash("admin123" if role == "admin" else "voter123"),
            role=role
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(subject=user.id, role=user.role)

    session_user = SessionUser(
        id=user.id,
        name=user.name,
        role=user.role,
        email=user.email,
        faceVerified=True
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=session_user
    )

@router.get("/me", response_model=SessionUser)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns current authenticated user details from JWT token context.
    """
    is_face_enrolled = True
    if current_user.role == "voter":
        voter = db.query(Voter).filter(Voter.user_id == current_user.id).first()
        if voter:
            is_face_enrolled = voter.face_enrolled

    return SessionUser(
        id=current_user.id,
        name=current_user.name,
        role=current_user.role,
        email=current_user.email,
        faceVerified=is_face_enrolled
    )

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Logs out current authenticated user and records audit trail.
    """
    log = AuditLog(
        id=f"log-{uuid.uuid4().hex[:8]}",
        actor=current_user.name,
        role=current_user.role,
        action="LOGOUT",
        entity="SessionToken",
        status="success",
        reference=current_user.email
    )
    db.add(log)
    db.commit()
    return {"success": True, "message": "Successfully logged out."}

