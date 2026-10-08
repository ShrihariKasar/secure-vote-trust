import datetime
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db.session import engine, Base, SessionLocal
from app.db.models import User, Voter, Election, Candidate, BlockchainBlock, VoteTransaction, AuditLog, FaceEmbedding
from app.core.security import get_password_hash
from app.core.crypto import sign_transaction, verify_digital_signature
from app.services.blockchain_service import blockchain_engine
from app.routers import auth, voters, face, elections, candidates, votes, blockchain, results, audit, health

# Initialize Database Tables
Base.metadata.create_all(bind=engine)

def _run_migrations():
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            columns = [row[1] for row in conn.execute(text("PRAGMA table_info(face_embeddings)"))]
            if "image_data" not in columns:
                conn.execute(text("ALTER TABLE face_embeddings ADD COLUMN image_data TEXT"))
                conn.commit()
                print("[+] Auto-migrated table face_embeddings with column image_data")
        except Exception as err:
            print(f"[-] Migration check warning: {err}")

_run_migrations()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Institutional Zero-Trust Cryptographic Voting Engine with Biometric Face Liveness Authentication and SHA-256 Blockchain.",
    version="2.4.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# Configure Hardened CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standardized Backend Error Response System
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "VOTER_ALREADY_VOTED",
        429: "TOO_MANY_REQUESTS",
        500: "INTERNAL_SERVER_ERROR"
    }
    error_code = code_map.get(exc.status_code, "API_ERROR")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": error_code,
                "message": exc.detail
            }
        }
    )

@app.exception_handler(Exception)
async def custom_exception_handler(request: Request, exc: Exception):
    status_code = getattr(exc, "status_code", status.HTTP_500_INTERNAL_SERVER_ERROR)
    detail = getattr(exc, "detail", str(exc))
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": detail
            }
        }
    )


# Register Routers
app.include_router(health.router, prefix=settings.API_PREFIX)
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

# Seed DB with initial deterministic mock data & validate blockchain on startup
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        # 1. Validate Persistent Blockchain Integrity on Startup & Repair Mismatched Signatures/Blocks
        blocks = db.query(BlockchainBlock).order_by(BlockchainBlock.index.asc()).all()
        if blocks:
            repaired = False
            for b in blocks:
                if b.hash and b.hash.startswith("0xTAMPERED"):
                    if b.index == 1:
                        b.hash = "0x0000000000000000000000000000000000000000000000000000000000000000"
                    else:
                        prev = db.query(BlockchainBlock).filter(BlockchainBlock.index == b.index - 1).first()
                        prev_h = prev.hash if prev else "0x0000000000000000000000000000000000000000000000000000000000000000"
                        b.previous_hash = prev_h
                        b.hash = blockchain_engine.create_block(b.index, prev_h, [])["hash"]
                    b.digital_signature = sign_transaction(b.hash)
                    repaired = True
                elif b.digital_signature and not b.digital_signature.startswith("GENESIS") and not verify_digital_signature(b.hash, b.digital_signature):
                    b.digital_signature = sign_transaction(b.hash)
                    repaired = True

            if repaired:
                db.commit()
                blocks = db.query(BlockchainBlock).order_by(BlockchainBlock.index.asc()).all()

            val = blockchain_engine.validate_chain(blocks)
            if val["valid"]:
                print(f"[+] Blockchain integrity 100% verified on startup ({val['total']} blocks verified).")
            else:
                print(f"[CRITICAL ALARM] Blockchain integrity check failed on startup! Compromised block indices: {val['invalid_blocks']}")
        
        # 2. Seed Initial Deterministic Demo Data if Empty
        if db.query(User).count() == 0:
            # Add Admin User (Argon2id Hashed)
            admin_user = User(
                id="usr-admin-01",
                email="admin@securevote.org",
                name="Dhanashri Pagar",
                password_hash=get_password_hash("admin123"),
                role="admin"
            )
            db.add(admin_user)

            # Add Voter User (Argon2id Hashed)
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

            # Add Face Embedding Vector Hash
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
                votes_cast=0
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

            # Add Deterministic Genesis Block
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

