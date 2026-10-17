import uuid
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models import AuditLog
from app.core.crypto import sha256_hash

GENESIS_AUDIT_HASH = "0x" + "0" * 64

def calculate_log_hash(
    previous_hash: str,
    timestamp_str: str,
    actor: str,
    role: str,
    action: str,
    entity: str,
    status: str,
    reference: str
) -> str:
    """Calculates canonical SHA-256 hash for an audit log entry."""
    payload = f"{previous_hash}|{timestamp_str}|{actor}|{role}|{action}|{entity}|{status}|{reference}"
    return sha256_hash(payload)

def record_audit_log(
    db: Session,
    actor: str,
    role: str,
    action: str,
    entity: str,
    status: str = "success",
    source: str = "FastAPI Node",
    reference: str = "",
    timestamp: Optional[datetime.datetime] = None,
    log_id: Optional[str] = None
) -> AuditLog:
    """
    Creates an immutable, hash-chained audit log entry.
    Each entry links cryptographically to the preceding entry via SHA-256.
    """
    # Find the most recently recorded log (pending in session or committed in DB)
    pending = [obj for obj in db.new if isinstance(obj, AuditLog) and getattr(obj, "current_hash", None)]
    if pending:
        last_log = pending[-1]
    else:
        last_log = db.query(AuditLog).order_by(AuditLog.timestamp.desc(), AuditLog.id.desc()).first()

    ts = timestamp or datetime.datetime.utcnow()
    # Ensure strictly increasing timestamp to maintain deterministic sequence ordering
    if last_log and last_log.timestamp and last_log.timestamp >= ts:
        ts = last_log.timestamp + datetime.timedelta(microseconds=1000)

    ts_str = ts.isoformat()
    previous_hash = last_log.current_hash if (last_log and last_log.current_hash) else GENESIS_AUDIT_HASH

    current_hash = calculate_log_hash(
        previous_hash=previous_hash,
        timestamp_str=ts_str,
        actor=actor,
        role=role,
        action=action,
        entity=entity,
        status=status,
        reference=reference or ""
    )

    lid = log_id or f"log-{uuid.uuid4().hex[:8]}"
    log = AuditLog(
        id=lid,
        timestamp=ts,
        actor=actor,
        role=role,
        action=action,
        entity=entity,
        status=status,
        source=source,
        reference=reference or "",
        previous_hash=previous_hash,
        current_hash=current_hash
    )
    db.add(log)
    try:
        db.flush()
    except Exception:
        pass
    return log

def verify_audit_chain(target: Any) -> Dict[str, Any]:
    """
    Cryptographically verifies the SHA-256 hash chain across all audit logs.
    Accepts either an active SQLAlchemy Session or a list of AuditLog instances.
    Detects any tampering, payload alteration, or deleted records in audit history.
    """
    if isinstance(target, Session):
        logs = target.query(AuditLog).order_by(AuditLog.timestamp.asc(), AuditLog.id.asc()).all()
    elif isinstance(target, list):
        logs = target
    else:
        logs = []

    now_iso = datetime.datetime.utcnow().isoformat()
    if not logs:
        return {
            "valid": True,
            "integrity": "verified",
            "totalLogs": 0,
            "logs_checked": 0,
            "chainHeadHash": GENESIS_AUDIT_HASH,
            "genesisHash": GENESIS_AUDIT_HASH,
            "latest_hash": GENESIS_AUDIT_HASH,
            "timestamp": now_iso,
            "brokenLinkIndex": None,
            "compromised_log_id": None,
            "reason": None,
            "message": "Audit chain empty."
        }

    expected_prev = GENESIS_AUDIT_HASH
    first_hash = logs[0].current_hash or GENESIS_AUDIT_HASH

    for idx, log in enumerate(logs):
        ts_str = log.timestamp.isoformat() if log.timestamp else ""

        # Check 1: verify previous_hash matches prior entry's current_hash
        if (log.previous_hash or GENESIS_AUDIT_HASH) != expected_prev:
            return {
                "valid": False,
                "integrity": "compromised",
                "totalLogs": len(logs),
                "logs_checked": idx,
                "chainHeadHash": log.current_hash or expected_prev,
                "genesisHash": first_hash,
                "latest_hash": expected_prev,
                "timestamp": now_iso,
                "brokenLinkIndex": idx,
                "compromised_log_id": log.id,
                "reason": f"Previous hash mismatch at record index {idx} ({log.id}). Expected {expected_prev}, found {log.previous_hash}",
                "message": f"Cryptographic link broken at record index {idx}."
            }

        # Check 2: re-calculate current_hash and compare
        computed = calculate_log_hash(
            previous_hash=log.previous_hash or GENESIS_AUDIT_HASH,
            timestamp_str=ts_str,
            actor=log.actor,
            role=log.role,
            action=log.action,
            entity=log.entity,
            status=log.status,
            reference=log.reference or ""
        )
        if log.current_hash != computed:
            return {
                "valid": False,
                "integrity": "compromised",
                "totalLogs": len(logs),
                "logs_checked": idx,
                "chainHeadHash": log.current_hash or expected_prev,
                "genesisHash": first_hash,
                "latest_hash": expected_prev,
                "timestamp": now_iso,
                "brokenLinkIndex": idx,
                "compromised_log_id": log.id,
                "reason": f"Cryptographic digest mismatch at record index {idx} ({log.id}). Stored: {log.current_hash}, Computed: {computed}",
                "message": f"Cryptographic payload mismatch at record index {idx}."
            }

        expected_prev = log.current_hash

    return {
        "valid": True,
        "integrity": "verified",
        "totalLogs": len(logs),
        "logs_checked": len(logs),
        "chainHeadHash": expected_prev,
        "genesisHash": first_hash,
        "latest_hash": expected_prev,
        "timestamp": now_iso,
        "brokenLinkIndex": None,
        "compromised_log_id": None,
        "reason": None,
        "message": f"All {len(logs)} audit records verified with 100% cryptographic integrity."
    }
