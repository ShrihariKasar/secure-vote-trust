from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.db.session import get_db
from app.db.models import VoteRecord, VoteTransaction, BlockchainBlock, Voter, Election, AuditLog
from app.core.crypto import generate_transaction_hash, encrypt_vote_payload, sha256_hash
from app.services.blockchain_service import blockchain_engine
import uuid
import datetime

router = APIRouter(tags=["Voting"])

class CastVoteInput(BaseModel):
    electionId: str
    candidateId: str
    voterId: str

class VoteTransactionResponse(BaseModel):
    transactionId: str
    electionId: str
    blockIndex: int
    blockHash: str
    previousHash: str
    timestamp: str
    signatureValid: bool
    verified: bool

@router.post("/votes", response_model=VoteTransactionResponse)
def cast_vote(input: CastVoteInput, db: Session = Depends(get_db)):
    # 1. Validate Election
    election = db.query(Election).filter(Election.id == input.electionId).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found.")

    # 2. Check for Double Voting (CRITICAL REQUIREMENT: HTTP 409 Conflict)
    existing_vote = db.query(VoteRecord).filter(
        VoteRecord.election_id == input.electionId,
        VoteRecord.voter_id == input.voterId
    ).first()

    if existing_vote:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Voter has already voted in this election."
        )

    # 3. Create Transaction Metadata
    timestamp_str = datetime.datetime.utcnow().isoformat()
    tx_hash = generate_transaction_hash(input.voterId, input.electionId, input.candidateId, timestamp_str)
    encrypted_choice = encrypt_vote_payload(input.candidateId)

    # 4. Find or Create Latest Block
    latest_block = db.query(BlockchainBlock).order_by(BlockchainBlock.index.desc()).first()
    if not latest_block:
        latest_block = BlockchainBlock(
            index=1,
            hash="0x0000000000000000000000000000000000000000000000000000000000000000",
            previous_hash="0x0000000000000000000000000000000000000000000000000000000000000000",
            timestamp=datetime.datetime.utcnow(),
            transaction_count=0,
            verified=True,
            merkle_root="0x0000000000000000000000000000000000000000000000000000000000000000",
            nonce=100000
        )
        db.add(latest_block)
        db.commit()
        db.refresh(latest_block)

    # Append to block / Create new mined block
    new_index = latest_block.index + 1
    new_block_raw = blockchain_engine.create_block(new_index, latest_block.hash, [tx_hash])
    
    new_block = BlockchainBlock(
        index=new_block_raw["index"],
        hash=new_block_raw["hash"],
        previous_hash=new_block_raw["previousHash"],
        timestamp=datetime.datetime.utcnow(),
        transaction_count=1,
        verified=True,
        merkle_root=new_block_raw["merkleRoot"],
        nonce=new_block_raw["nonce"]
    )
    db.add(new_block)

    # 5. Store Encrypted Vote Record
    vote_record = VoteRecord(
        id=f"rec-{uuid.uuid4().hex[:8]}",
        election_id=input.electionId,
        candidate_id=input.candidateId,
        voter_id=input.voterId,
        transaction_id=tx_hash,
        encrypted_choice=encrypted_choice,
        created_at=datetime.datetime.utcnow()
    )
    db.add(vote_record)

    # 6. Store Blockchain Vote Transaction
    vote_tx = VoteTransaction(
        transaction_id=tx_hash,
        election_id=input.electionId,
        block_index=new_block.index,
        block_hash=new_block.hash,
        previous_hash=new_block.previous_hash,
        timestamp=datetime.datetime.utcnow(),
        signature_valid=True,
        verified=True
    )
    db.add(vote_tx)

    # 7. Update Election Vote Count & Voter Voting Status
    election.votes_cast += 1
    voter = db.query(Voter).filter(Voter.id == input.voterId).first()
    if voter:
        voter.voting = "vote_recorded"

    # 8. Create Audit Log Entry
    audit = AuditLog(
        id=f"log-{uuid.uuid4().hex[:8]}",
        actor=voter.name if voter else input.voterId,
        role="voter",
        action="BALLOT_CAST_SUCCESS",
        entity=f"Election:{input.electionId}",
        status="success",
        reference=tx_hash
    )
    db.add(audit)

    db.commit()

    return VoteTransactionResponse(
        transactionId=vote_tx.transaction_id,
        electionId=vote_tx.election_id,
        blockIndex=vote_tx.block_index,
        blockHash=vote_tx.block_hash,
        previousHash=vote_tx.previous_hash,
        timestamp=vote_tx.timestamp.isoformat(),
        signatureValid=vote_tx.signature_valid,
        verified=vote_tx.verified
    )

@router.get("/voter/my-vote", response_model=Optional[VoteTransactionResponse])
def get_my_vote(voter_id: str = "usr-voter-01", db: Session = Depends(get_db)):
    vote_rec = db.query(VoteRecord).filter(VoteRecord.voter_id == voter_id).order_by(VoteRecord.created_at.desc()).first()
    if not vote_rec:
        return None

    tx = db.query(VoteTransaction).filter(VoteTransaction.transaction_id == vote_rec.transaction_id).first()
    if not tx:
        return None

    return VoteTransactionResponse(
        transactionId=tx.transaction_id,
        electionId=tx.election_id,
        blockIndex=tx.block_index,
        blockHash=tx.block_hash,
        previousHash=tx.previous_hash,
        timestamp=tx.timestamp.isoformat(),
        signatureValid=tx.signature_valid,
        verified=tx.verified
    )
