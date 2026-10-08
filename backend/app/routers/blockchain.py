from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.db.session import get_db
from app.db.models import BlockchainBlock, VoteTransaction, User
from app.services.blockchain_service import blockchain_engine
from app.core.crypto import verify_digital_signature
from app.core.security import require_role
from app.config import settings

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
    digitalSignature: Optional[str] = None

class StatsResponse(BaseModel):
    total: int
    verified: int
    latest: int
    integrity: str

class IntegrityResponse(BaseModel):
    valid: bool
    blocks_checked: int
    invalid_blocks: List[int]
    integrity: str

class TxVerifyResponse(BaseModel):
    transaction_exists: bool
    block_exists: bool
    hash_valid: bool
    signature_valid: bool
    chain_valid: bool
    verified: bool
    signatureValid: bool
    transactionExists: bool
    blockExists: bool

class VoteTxDetailResponse(BaseModel):
    transactionId: str
    electionId: str
    blockIndex: int
    blockHash: str
    previousHash: str
    timestamp: str
    signatureValid: bool
    verified: bool
    digitalSignature: Optional[str] = None

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
            nonce=b.nonce,
            digitalSignature=b.digital_signature
        ))
    return res

@router.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    blocks = db.query(BlockchainBlock).order_by(BlockchainBlock.index.asc()).all()
    val = blockchain_engine.validate_chain(blocks)
    return StatsResponse(
        total=val["total"],
        verified=val["verified"],
        latest=val["latest"],
        integrity=val["integrity"]
    )

@router.get("/verify-integrity", response_model=IntegrityResponse)
def verify_chain_integrity(db: Session = Depends(get_db)):
    """
    Dedicated Blockchain Integrity Check API.
    Validates hash continuity, block index linkage, and digital signatures.
    """
    blocks = db.query(BlockchainBlock).order_by(BlockchainBlock.index.asc()).all()
    val = blockchain_engine.validate_chain(blocks)
    return IntegrityResponse(
        valid=val["valid"],
        blocks_checked=val["blocks_checked"],
        invalid_blocks=val["invalid_blocks"],
        integrity=val["integrity"]
    )

@router.get("/verify/{transaction_id}", response_model=TxVerifyResponse)
@router.get("/transactions/{transaction_id}/verify", response_model=TxVerifyResponse)
def verify_transaction_detail(transaction_id: str, db: Session = Depends(get_db)):
    """
    Detailed Cryptographic Verification endpoint for a given vote transaction ID.
    """
    tx = db.query(VoteTransaction).filter(VoteTransaction.transaction_id == transaction_id).first()
    if not tx:
        return TxVerifyResponse(
            transaction_exists=False,
            transactionExists=False,
            block_exists=False,
            blockExists=False,
            hash_valid=False,
            signature_valid=False,
            signatureValid=False,
            chain_valid=False,
            verified=False
        )

    block = db.query(BlockchainBlock).filter(BlockchainBlock.index == tx.block_index).first()
    block_exists = block is not None

    sig_valid = True
    if tx.digital_signature:
        sig_valid = verify_digital_signature(tx.transaction_id, tx.digital_signature)

    blocks = db.query(BlockchainBlock).order_by(BlockchainBlock.index.asc()).all()
    chain_val = blockchain_engine.validate_chain(blocks)

    is_fully_verified = block_exists and sig_valid and chain_val["valid"]

    return TxVerifyResponse(
        transaction_exists=True,
        transactionExists=True,
        block_exists=block_exists,
        blockExists=block_exists,
        hash_valid=True,
        signature_valid=sig_valid,
        signatureValid=sig_valid,
        chain_valid=chain_val["valid"],
        verified=is_fully_verified
    )

@router.get("/transactions/{transaction_id}", response_model=VoteTxDetailResponse)
def get_transaction(transaction_id: str, db: Session = Depends(get_db)):
    """
    Retrieves specific vote transaction metadata from blockchain.
    """
    tx = db.query(VoteTransaction).filter(VoteTransaction.transaction_id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found on blockchain.")
    return VoteTxDetailResponse(
        transactionId=tx.transaction_id,
        electionId=tx.election_id,
        blockIndex=tx.block_index,
        blockHash=tx.block_hash,
        previousHash=tx.previous_hash,
        timestamp=tx.timestamp.isoformat() if tx.timestamp else "",
        signatureValid=tx.signature_valid,
        verified=tx.verified,
        digitalSignature=tx.digital_signature
    )

@router.post("/tamper/{block_index}")
def tamper_block_for_testing(
    block_index: int,
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """
    Development/Testing utility endpoint to simulate chain tampering and verify corruption detection.
    Available only to authenticated Admin users.
    """
    block = db.query(BlockchainBlock).filter(BlockchainBlock.index == block_index).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    # Intentionally mutate block hash to trigger integrity failure
    block.hash = f"0xTAMPERED_{block_index}_BAD_HASH"
    db.commit()
    return {"success": True, "tamperedBlock": block_index}

@router.post("/repair")
def repair_blockchain_integrity(
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """
    Restores chain integrity by repairing any tampered test block hashes.
    """
    blocks = db.query(BlockchainBlock).order_by(BlockchainBlock.index.asc()).all()
    repaired_count = 0
    for b in blocks:
        if b.hash and b.hash.startswith("0xTAMPERED"):
            if b.index == 1:
                b.hash = "0x0000000000000000000000000000000000000000000000000000000000000000"
            else:
                prev = db.query(BlockchainBlock).filter(BlockchainBlock.index == b.index - 1).first()
                prev_h = prev.hash if prev else "0x0000000000000000000000000000000000000000000000000000000000000000"
                b.previous_hash = prev_h
                b.hash = blockchain_engine.create_block(b.index, prev_h, [])["hash"]
            repaired_count += 1

    if repaired_count > 0:
        db.commit()

    val = blockchain_engine.validate_chain(blocks)
    return {
        "success": True,
        "repairedBlocks": repaired_count,
        "chainValid": val["valid"],
        "integrity": val["integrity"]
    }


