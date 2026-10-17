import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.db.models import Candidate, Election, AuditLog, User
from app.core.security import require_role
from app.core.audit import record_audit_log

router = APIRouter(tags=["Candidates"])

class CandidateInput(BaseModel):
    name: str
    position: str
    manifesto: str
    symbol: Optional[str] = "🪷 Lotus (कमल / BJP)"
    symbolImage: Optional[str] = None
    workHistory: Optional[str] = None
    id: Optional[str] = None

class CandidateResponse(BaseModel):
    id: str
    electionId: str
    name: str
    position: str
    manifesto: str
    initials: str
    status: str
    symbol: Optional[str] = "🪷 Lotus (कमल / BJP)"
    symbolImage: Optional[str] = None
    workHistory: Optional[str] = None

@router.get("/elections/{election_id}/candidates", response_model=List[CandidateResponse])
def list_candidates_by_election(election_id: str, db: Session = Depends(get_db)):
    candidates = db.query(Candidate).filter(Candidate.election_id == election_id).all()
    res = []
    for c in candidates:
        sym = getattr(c, "symbol", "") or "🪷 Lotus (कमल / BJP)"
        sym_img = getattr(c, "symbol_image", None)
        # If symbol is itself a data URL, provide it as symbolImage
        if not sym_img and sym and (sym.startswith("data:image/") or sym.startswith("http")):
            sym_img = sym
        res.append(CandidateResponse(
            id=c.id,
            electionId=c.election_id,
            name=c.name,
            position=c.position,
            manifesto=c.manifesto,
            initials=c.initials,
            status=c.status,
            symbol=sym,
            symbolImage=sym_img,
            workHistory=getattr(c, "work_history", None)
        ))
    return res

@router.post("/elections/{election_id}/candidates", response_model=CandidateResponse)
def create_candidate(
    election_id: str,
    input: CandidateInput,
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    # Verify election existence and state
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    if election.status in ("voting_open", "voting_closed", "results_published", "OPEN", "CLOSED"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot add candidates once voting has started or election is published (current status: {election.status})."
        )

    cand_id = input.id or f"cand-{uuid.uuid4().hex[:4]}"
    initials = "".join([n[0] for n in input.name.split() if n])[:2].upper() or "CN"
    symbol = (input.symbol or "🪷 Lotus (कमल / BJP)").strip()
    symbol_image = input.symbolImage
    if not symbol_image and (symbol.startswith("data:image/") or symbol.startswith("http")):
        symbol_image = symbol
    
    cand = Candidate(
        id=cand_id,
        election_id=election_id,
        name=input.name.strip(),
        position=input.position.strip(),
        manifesto=input.manifesto.strip(),
        initials=initials,
        symbol=symbol,
        symbol_image=symbol_image,
        work_history=(input.workHistory or "").strip() or None,
        status="active"
    )
    db.add(cand)

    record_audit_log(
        db=db,
        actor=admin_user.name,
        role="admin",
        action="CANDIDATE_ADDED",
        entity=f"Candidate:{cand_id}",
        status="success",
        reference=input.name
    )
    db.commit()
    db.refresh(cand)

    return CandidateResponse(
        id=cand.id,
        electionId=cand.election_id,
        name=cand.name,
        position=cand.position,
        manifesto=cand.manifesto,
        initials=cand.initials,
        status=cand.status,
        symbol=cand.symbol,
        symbolImage=getattr(cand, "symbol_image", None),
        workHistory=getattr(cand, "work_history", None)
    )

@router.delete("/candidates/{id}")
def remove_candidate(
    id: str,
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate record not found")
    
    election = db.query(Election).filter(Election.id == cand.election_id).first()
    if election and election.status in ("voting_open", "voting_closed", "results_published", "OPEN", "CLOSED"):
        raise HTTPException(
            status_code=400,
            detail="Cannot delete candidate after voting has commenced."
        )

    db.delete(cand)
    record_audit_log(
        db=db,
        actor=admin_user.name,
        role="admin",
        action="CANDIDATE_REMOVED",
        entity=f"Candidate:{id}",
        status="warning",
        reference=cand.name
    )
    db.commit()
    return {"success": True}

