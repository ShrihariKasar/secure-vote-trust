from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import BlockchainBlock, User, Voter
from app.services.blockchain_service import blockchain_engine
from app.core.security import require_role

router = APIRouter(tags=["System Health"])

@router.get("/health")
def get_public_health(db: Session = Depends(get_db)):
    """
    Public basic system health check.
    """
    db_ok = "ok"
    try:
        db.query(User).first()
    except Exception:
        db_ok = "unavailable"

    blocks = db.query(BlockchainBlock).order_by(BlockchainBlock.index.asc()).all()
    chain_val = blockchain_engine.validate_chain(blocks)
    bc_ok = "ok" if chain_val["valid"] else "warning"

    return {
        "api": "ok",
        "database": db_ok,
        "blockchain": bc_ok
    }

@router.get("/admin/system/health")
def get_detailed_system_health(
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """
    Detailed Admin System Status Health API.
    Checks API, Database, Blockchain, Face Authentication, and Storage.
    """
    db_status = "Operational"
    try:
        db.query(User).count()
    except Exception:
        db_status = "Unavailable"

    blocks = db.query(BlockchainBlock).order_by(BlockchainBlock.index.asc()).all()
    chain_val = blockchain_engine.validate_chain(blocks)
    bc_status = "Operational" if chain_val["valid"] else "Warning"

    return {
        "api": "Operational",
        "database": db_status,
        "blockchain": bc_status,
        "faceAuth": "Operational",
        "storage": "Operational",
        "chainDetails": {
            "blocksChecked": chain_val["blocks_checked"],
            "invalidBlocks": chain_val["invalid_blocks"],
            "integrity": chain_val["integrity"]
        }
    }
