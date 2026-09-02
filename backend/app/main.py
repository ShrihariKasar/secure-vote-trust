import datetime
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.db.session import engine, Base, SessionLocal
from app.db.models import User, Voter, Election, Candidate, BlockchainBlock, VoteTransaction, AuditLog, FaceEmbedding
from app.core.security import get_password_hash
from app.routers import auth, voters, face, elections, candidates, votes, blockchain, results, audit

# Initialize Database Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Institutional Zero-Trust Cryptographic Voting Engine with Biometric Face Liveness Authentication and SHA-256 Blockchain.",
    version="2.4.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Exception Handler for Standard Error Format
@app.exception_handler(Exception)
async def custom_exception_handler(request: Request, exc: Exception):
    if hasattr(exc, "status_code"):
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "detail": getattr(exc, "detail", str(exc))}
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "detail": str(exc)}
    )

# Register Routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(voters.router, prefix=settings.API_PREFIX)
app.include_router(face.router, prefix=settings.API_PREFIX)
app.include_router(elections.router, prefix=settings.API_PREFIX)
app.include_router(candidates.router, prefix=settings.API_PREFIX)
app.include_router(votes.router, prefix=settings.API_PREFIX)
app.include_router(blockchain.router, prefix=settings.API_PREFIX)
app.include_router(results.router, prefix=settings.API_PREFIX)
app.include_router(audit.router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": "2.4.0",
        "documentation": "/docs"
    }

# Seed DB with initial deterministic mock data if empty
@app.on_event("startup")
def seed_initial_data():
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            # Add Admin User
            admin_user = User(
                id="usr-admin-01",
                email="admin@securevote.org",
                name="Elena Vance",
                password_hash=get_password_hash("admin123"),
                role="admin"
            )
            db.add(admin_user)

            # Add Voter User
            voter_user = User(
                id="usr-voter-01",
                email="aris.thorne@university.edu",
                name="Dr. Aris Thorne",
                password_hash=get_password_hash("voter123"),
                role="voter"
            )
            db.add(voter_user)

            # Add Voter Profile
            voter = Voter(
                id="usr-voter-01",
                user_id="usr-voter-01",
                name="Dr. Aris Thorne",
                email="aris.thorne@university.edu",
                mobile="+1 (555) 019-2834",
                registered_at=datetime.datetime.utcnow(),
                face_enrolled=True,
                approval="approved",
                voting="not_voted"
            )
            db.add(voter)

            # Add Face Embedding
            db.add(FaceEmbedding(
                voter_id="usr-voter-01",
                vector_hash="0x7f9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
                reference="face-ref-usr-voter-01"
            ))

            # Add Elections
            e1 = Election(
                id="el-01",
                name="General Presidential Election 2026",
                description="Constitutional vote to elect the Chief Executive and Presidential Officer.",
                status="voting_open",
                start_at=datetime.datetime.utcnow() - datetime.timedelta(days=1),
                end_at=datetime.datetime.utcnow() + datetime.timedelta(days=3),
                registered_voters=2500,
                votes_cast=1485
            )
            e2 = Election(
                id="el-02",
                name="Academic Council Charter Reform",
                description="Institutional referendum on amending faculty governance protocols.",
                status="scheduled",
                start_at=datetime.datetime.utcnow() + datetime.timedelta(days=5),
                end_at=datetime.datetime.utcnow() + datetime.timedelta(days=10),
                registered_voters=1800,
                votes_cast=0
            )
            db.add(e1)
            db.add(e2)

            # Add Candidates
            c1 = Candidate(
                id="cand-01",
                election_id="el-01",
                name="Dr. Eleanor Vance",
                position="Presidential Candidate",
                manifesto="Championing academic transparency, open-source technology standards, and zero-trust electoral oversight.",
                initials="EV",
                status="active"
            )
            c2 = Candidate(
                id="cand-02",
                election_id="el-01",
                name="Marcus Sterling",
                position="Presidential Candidate",
                manifesto="Expanding research infrastructure, modernizing digital tools, and building sustainable university endowments.",
                initials="MS",
                status="active"
            )
            db.add(c1)
            db.add(c2)

            # Add Initial Blockchain Block
            b1 = BlockchainBlock(
                index=1,
                hash="0x0000000000000000000000000000000000000000000000000000000000000000",
                previous_hash="0x0000000000000000000000000000000000000000000000000000000000000000",
                timestamp=datetime.datetime.utcnow(),
                transaction_count=0,
                verified=True,
                merkle_root="0x0000000000000000000000000000000000000000000000000000000000000000",
                nonce=1948201
            )
            db.add(b1)

            # Add Audit Log
            db.add(AuditLog(
                id="log-init-01",
                actor="System Genesis",
                role="system",
                action="DATABASE_INITIALIZED",
                entity="SQLite Engine",
                status="success",
                reference="v2.4.0"
            ))

            db.commit()
    finally:
        db.close()
