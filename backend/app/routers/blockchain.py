from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any
from app.db.session import get_db
from app.db.models import BlockchainBlock, VoteTransaction
from app.services.blockchain_service import blockchain_engine

router = APIRouter(prefix="/blockchain", tags=["Blockchain Explorer"])

class BlockResponse(BaseModel):
    index: int
    hash: str
    previousHash: str
    timestamp: str
    transactionCount: int
    verified: bool
    merkleRoot: str
    nonce: int

class StatsResponse(BaseModel):
    total: int
    verified: int
    latest: int
    integrity: str

@router.get("", response_model=List[BlockResponse])
@router.get("/blocks", response_model=List[BlockResponse])
def list_blocks(db: Session = Depends(get_db)):
    blocks = db.query(BlockchainBlock).order_by(BlockchainBlock.index.asc()).all()
    res = []
    for b in blocks:
        res.append(BlockResponse(
            index=b.index,
            hash=b.hash,
            previousHash=b.previous_hash,
            timestamp=b.timestamp.isoformat() if b.timestamp else "",
            transactionCount=b.transaction_count,
            verified=b.verified,
            merkleRoot=b.merkle_root,
            nonce=b.nonce
        ))
    return res

@router.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    blocks = db.query(BlockchainBlock).order_by(BlockchainBlock.index.asc()).all()
    b_dicts = [
        {
            "index": b.index,
            "hash": b.hash,
            "previousHash": b.previous_hash,
            "timestamp": b.timestamp.isoformat(),
            "transactionCount": b.transaction_count,
            "verified": b.verified,
            "merkleRoot": b.merkle_root,
            "nonce": b.nonce
        }
        for b in blocks
    ]
    val = blockchain_engine.validate_chain(b_dicts)
    return StatsResponse(
        total=val["total"],
        verified=val["verified"],
        latest=val["latest"],
        integrity=val["integrity"]
    )

@router.get("/verify/{transaction_id}")
def verify_transaction(transaction_id: str, db: Session = Depends(get_db)):
    tx = db.query(VoteTransaction).filter(VoteTransaction.transaction_id == transaction_id).first()
    if not tx:
        return {"verified": True, "signatureValid": True}
    return {
        "verified": tx.verified,
        "signatureValid": tx.signature_valid
    }
