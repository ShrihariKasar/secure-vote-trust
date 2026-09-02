from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from app.db.session import get_db
from app.db.models import Candidate, Election, AuditLog
import uuid

router = APIRouter(tags=["Candidates"])

class CandidateInput(BaseModel):
    name: str
    position: str
    manifesto: str
    id: str = None

class CandidateResponse(BaseModel):
    id: str
    electionId: str
    name: str
    position: str
    manifesto: str
    initials: str
    status: str

@router.get("/elections/{election_id}/candidates", response_model=List[CandidateResponse])
def list_candidates_by_election(election_id: str, db: Session = Depends(get_db)):
    candidates = db.query(Candidate).filter(Candidate.election_id == election_id).all()
    res = []
    for c in candidates:
        res.append(CandidateResponse(
            id=c.id,
            electionId=c.election_id,
            name=c.name,
            position=c.position,
            manifesto=c.manifesto,
            initials=c.initials,
            status=c.status
        ))
    return res

@router.post("/elections/{election_id}/candidates", response_model=CandidateResponse)
def create_candidate(election_id: str, input: CandidateInput, db: Session = Depends(get_db)):
    cand_id = input.id or f"cand-{uuid.uuid4().hex[:4]}"
    
    initials = "".join([n[0] for n in input.name.split() if n])[:2].upper()
    
    cand = Candidate(
        id=cand_id,
        election_id=election_id,
        name=input.name,
        position=input.position,
        manifesto=input.manifesto,
        initials=initials,
        status="active"
    )
    db.add(cand)

    audit = AuditLog(
        id=f"log-{uuid.uuid4().hex[:8]}",
        actor="Elena Vance",
        role="admin",
        action="CANDIDATE_ADDED",
        entity=f"Candidate:{cand_id}",
        status="success",
        reference=input.name
    )
    db.add(audit)
    db.commit()
    db.refresh(cand)

    return CandidateResponse(
        id=cand.id,
        electionId=cand.election_id,
        name=cand.name,
        position=cand.position,
        manifesto=cand.manifesto,
        initials=cand.initials,
        status=cand.status
    )

@router.delete("/candidates/{id}")
def remove_candidate(id: str, db: Session = Depends(get_db)):
    cand = db.query(Candidate).filter(Candidate.id == id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    db.delete(cand)
    db.commit()
    return {"success": True}
