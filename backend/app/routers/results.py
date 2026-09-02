import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.db.models import Election, Candidate, VoteRecord, Voter, BlockchainBlock
from app.services.blockchain_service import blockchain_engine

router = APIRouter(tags=["Election Results"])

class CandidateResult(BaseModel):
    candidateId: str
    name: str
    position: str
    votes: int
    percentage: float
    rank: int

class ElectionResultResponse(BaseModel):
    electionId: str
    electionName: str
    status: str
    registered: int
    votesCast: int
    turnout: float
    results: List[CandidateResult]
    chainVerified: bool
    resultsGeneratedAt: str
    resultsVersion: str = "v2.4-crypto"

@router.get("/elections/{election_id}/results", response_model=ElectionResultResponse)
def get_election_results(election_id: str, db: Session = Depends(get_db)):
    """
    Authoritative backend vote aggregation and election results calculation.
    Validates blockchain integrity to confirm chainVerified status.
    """
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election record not found")

    candidates = db.query(Candidate).filter(Candidate.election_id == election_id).all()
    vote_records = db.query(VoteRecord).filter(VoteRecord.election_id == election_id).all()

    total_votes = len(vote_records)
    cand_counts = {}
    for vr in vote_records:
        cand_counts[vr.candidate_id] = cand_counts.get(vr.candidate_id, 0) + 1

    cand_results = []
    for c in candidates:
        cnt = cand_counts.get(c.id, 0)
        pct = round((cnt / max(total_votes, 1)) * 100, 1) if total_votes > 0 else 0.0
        cand_results.append({
            "candidateId": c.id,
            "name": c.name,
            "position": c.position,
            "votes": cnt,
            "percentage": pct,
            "rank": 0
        })

    # Sort by vote count descending to calculate ranks
    cand_results.sort(key=lambda x: x["votes"], reverse=True)
    for idx, item in enumerate(cand_results):
        item["rank"] = idx + 1

    registered_cnt = election.registered_voters or 2500
    turnout_pct = round((total_votes / max(registered_cnt, 1)) * 100, 1)

    # Perform real backend blockchain integrity check
    blocks = db.query(BlockchainBlock).order_by(BlockchainBlock.index.asc()).all()
    chain_val = blockchain_engine.validate_chain(blocks)

    return ElectionResultResponse(
        electionId=election.id,
        electionName=election.name,
        status=election.status,
        registered=registered_cnt,
        votesCast=total_votes,
        turnout=turnout_pct,
        results=[CandidateResult(**cr) for cr in cand_results],
        chainVerified=chain_val["valid"],
        resultsGeneratedAt=datetime.datetime.utcnow().isoformat(),
        resultsVersion="v2.4-crypto"
    )

