import datetime
from typing import Optional, Union, Any, Dict
from collections import defaultdict
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.config import settings
from app.db.session import get_db

# Passlib Context using Argon2id with Bcrypt fallback for hashing
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")

# OAuth2 Scheme for Bearer Header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/login", auto_error=False)

# In-memory Throttling / Lockout Tracker for Academic Deployment
_failed_login_attempts: Dict[str, list] = defaultdict(list)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against hashed password using Argon2id/Bcrypt. NO PLAINTEXT FALLBACK."""
    if not plain_password or not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Hashes password using Argon2id."""
    return pwd_context.hash(password)

def create_access_token(subject: str, role: str, expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Generates signed JWT access token containing user ID and role."""
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.datetime.utcnow()
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and validates JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

def check_login_lockout(identifier: str):
    """Checks if identifier is currently throttled due to repeated failed login attempts."""
    now = datetime.datetime.utcnow()
    cutoff = now - datetime.timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
    # Filter out expired attempts
    recent_failures = [t for t in _failed_login_attempts[identifier] if t > cutoff]
    _failed_login_attempts[identifier] = recent_failures
    if len(recent_failures) >= settings.MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Account temporarily locked for {settings.LOCKOUT_DURATION_MINUTES} minutes."
        )

def record_login_failure(identifier: str):
    """Records a failed login attempt for rate limiting / lockout."""
    _failed_login_attempts[identifier].append(datetime.datetime.utcnow())

def reset_login_failures(identifier: str):
    """Resets failed login attempts counter upon successful login."""
    if identifier in _failed_login_attempts:
        del _failed_login_attempts[identifier]

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """FastAPI Dependency: Authoritative backend validation of current authenticated user from JWT bearer token."""
    from app.db.models import User
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user no longer exists",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user

def require_role(required_role: str):
    """Factory for Role-Based Access Control (RBAC) dependency."""
    def role_checker(current_user = Depends(get_current_user)):
        if current_user.role != required_role and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires '{required_role}' authorization"
            )
        return current_user
    return role_checker

