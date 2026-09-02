from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.db.session import get_db
from app.db.models import AuditLog

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

@router.get("", response_model=List[AuditEntryResponse])
def list_audit_logs(
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
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

    logs = query.order_by(AuditLog.timestamp.desc()).all()
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
            reference=l.reference
        ))
    return res
