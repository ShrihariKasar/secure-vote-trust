from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.db.session import get_db
from app.db.models import AuditLog, User
from app.core.security import require_role
from app.core.audit import verify_audit_chain, record_audit_log

router = APIRouter(prefix="/audit-logs", tags=["Audit Trail"])

class AuditEntryResponse(BaseModel):
    id: str
    timestamp: str
    actor: str
    role: str
    action: str
    entity: str
    status: str
    source: str
    reference: str
    previousHash: Optional[str] = None
    currentHash: Optional[str] = None

class ChainVerificationResponse(BaseModel):
    valid: bool
    integrity: str
    totalLogs: int = 0
    logs_checked: int = 0
    chainHeadHash: Optional[str] = None
    genesisHash: Optional[str] = None
    latest_hash: Optional[str] = None
    timestamp: str
    brokenLinkIndex: Optional[int] = None
    compromised_log_id: Optional[str] = None
    reason: Optional[str] = None
    message: Optional[str] = None

@router.get("", response_model=List[AuditEntryResponse])
def list_audit_logs(
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """
    Retrieves immutable system audit logs with cryptographic hash chain metadata.
    Restricted to Admin users.
    """
    query = db.query(AuditLog)
    if search:
        query = query.filter(
            (AuditLog.actor.ilike(f"%{search}%")) |
            (AuditLog.action.ilike(f"%{search}%")) |
            (AuditLog.reference.ilike(f"%{search}%"))
        )
    if role and role != "all":
        query = query.filter(AuditLog.role == role)
    if status and status != "all":
        query = query.filter(AuditLog.status == status)

    logs = query.order_by(AuditLog.timestamp.desc(), AuditLog.id.desc()).all()
    res = []
    for l in logs:
        res.append(AuditEntryResponse(
            id=l.id,
            timestamp=l.timestamp.isoformat() if l.timestamp else "",
            actor=l.actor,
            role=l.role,
            action=l.action,
            entity=l.entity,
            status=l.status,
            source=l.source,
            reference=l.reference or "",
            previousHash=l.previous_hash,
            currentHash=l.current_hash
        ))
    return res

@router.get("/verify-chain", response_model=ChainVerificationResponse)
def verify_audit_log_chain(
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """
    Cryptographically verifies the SHA-256 hash chain across all chronological audit records.
    Detects any database tampering, unauthorized modifications, or deleted logs.
    """
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.asc(), AuditLog.id.asc()).all()
    result = verify_audit_chain(logs)
    return ChainVerificationResponse(**result)

@router.get("/actions", response_model=List[str])
def list_audit_actions(
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """
    Returns unique audit action event types recorded in system.
    """
    actions = db.query(AuditLog.action).distinct().all()
    return [a[0] for a in actions if a[0]]
