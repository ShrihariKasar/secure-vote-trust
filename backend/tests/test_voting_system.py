import pytest
import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.config import settings
from app.db.session import get_db, Base
from app.db.models import User, Voter, Election, Candidate, BlockchainBlock, VoteRecord, AuditLog, VoterElectionState
from app.core.security import get_password_hash, verify_password, create_access_token

# Test Database setup in memory
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_securevote.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Seed Admin User
    admin = User(
        id="usr-admin-01",
        email="admin@securevote.org",
        name="Dhanashri Pagar",
        password_hash=get_password_hash("admin123"),
        role="admin"
    )
    db.add(admin)

    # Seed Voter User 1
    voter1 = User(
        id="usr-voter-01",
        email="aris.thorne@university.edu",
        name="Dr. Aris Thorne",
        password_hash=get_password_hash("voter123"),
        role="voter"
    )
    db.add(voter1)

    voter_prof1 = Voter(
        id="usr-voter-01",
        user_id="usr-voter-01",
        name="Dr. Aris Thorne",
        email="aris.thorne@university.edu",
        registered_at=datetime.datetime.utcnow(),
        face_enrolled=True,
        approval="approved",
        voting="not_voted"
    )
    db.add(voter_prof1)

    # Seed Voter User 2
    voter2 = User(
        id="usr-voter-02",
        email="marcus.sterling@university.edu",
        name="Marcus Sterling",
        password_hash=get_password_hash("voter123"),
        role="voter"
    )
    db.add(voter2)

    voter_prof2 = Voter(
        id="usr-voter-02",
        user_id="usr-voter-02",
        name="Marcus Sterling",
        email="marcus.sterling@university.edu",
        registered_at=datetime.datetime.utcnow(),
        face_enrolled=True,
        approval="approved",
        voting="not_voted"
    )
    db.add(voter_prof2)

    # Seed Election
    elec = Election(
        id="el-01",
        name="General Presidential Election 2026",
        description="Test Election",
        status="voting_open",
        start_at=datetime.datetime.utcnow() - datetime.timedelta(days=1),
        end_at=datetime.datetime.utcnow() + datetime.timedelta(days=2),
        registered_voters=10,
        votes_cast=0
    )
    db.add(elec)

    # Seed Candidates
    c1 = Candidate(id="cand-01", election_id="el-01", name="Candidate A", position="Pres", manifesto="Manifesto A", initials="CA", status="active")
    c2 = Candidate(id="cand-02", election_id="el-01", name="Candidate B", position="Pres", manifesto="Manifesto B", initials="CB", status="active")
    db.add(c1)
    db.add(c2)

    # Seed Genesis Block
    genesis = BlockchainBlock(
        index=1,
        hash="0x0000000000000000000000000000000000000000000000000000000000000000",
        previous_hash="0x0000000000000000000000000000000000000000000000000000000000000000",
        timestamp=datetime.datetime.utcnow(),
        transaction_count=0,
        verified=True,
        merkle_root="0x0000000000000000000000000000000000000000000000000000000000000000",
        nonce=1948201,
        digital_signature="GENESIS_SIG"
    )
    db.add(genesis)

    db.commit()
    db.close()

client = TestClient(app)

def get_auth_header(user_id: str = "usr-voter-01", role: str = "voter"):
    token = create_access_token(subject=user_id, role=role)
    return {"Authorization": f"Bearer {token}"}

def test_password_hashing():
    hashed = get_password_hash("secret123")
    assert verify_password("secret123", hashed) is True
    assert verify_password("wrongpass", hashed) is False
    assert verify_password("", hashed) is False

def test_login_success_and_failure():
    # Valid Login
    res = client.post("/api/auth/login", json={"identifier": "admin@securevote.org", "password": "admin123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"

    # Invalid Password
    res = client.post("/api/auth/login", json={"identifier": "admin@securevote.org", "password": "wrong"})
    assert res.status_code == 401

def test_login_throttling_lockout():
    identifier = "voter_lockout_test@securevote.org"
    # Submit 5 failed attempts
    for _ in range(5):
        client.post("/api/auth/login", json={"identifier": identifier, "password": "bad"})
    # 6th attempt must return 429
    res = client.post("/api/auth/login", json={"identifier": identifier, "password": "bad"})
    assert res.status_code == 429

def test_rbac_authorization():
    voter_headers = get_auth_header("usr-voter-01", "voter")
    admin_headers = get_auth_header("usr-admin-01", "admin")

    # Voter trying to access admin route -> 403 FORBIDDEN
    res = client.get("/api/admin/voters", headers=voter_headers)
    assert res.status_code == 403

    # Admin accessing admin route -> 200 OK
    res = client.get("/api/admin/voters", headers=admin_headers)
    assert res.status_code == 200

def test_face_verification_issues_voting_session():
    voter_headers = get_auth_header("usr-voter-01", "voter")
    res = client.post("/api/face/verify", json={"electionId": "el-01"}, headers=voter_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["verified"] is True
    assert "votingSessionToken" in data
    assert data["votingSessionToken"].startswith("VOTE-SESS-")

def test_voting_and_double_vote_protection():
    voter_headers = get_auth_header("usr-voter-01", "voter")
    
    # Get initial face voting session
    face_res1 = client.post("/api/face/verify", json={"electionId": "el-01"}, headers=voter_headers).json()
    session_token1 = face_res1["votingSessionToken"]

    # First vote -> 200 OK
    vote_res1 = client.post(
        "/api/votes",
        json={"electionId": "el-01", "candidateId": "cand-01", "votingSessionToken": session_token1},
        headers=voter_headers
    )
    assert vote_res1.status_code == 200
    vote_data = vote_res1.json()
    assert vote_data["verified"] is True
    assert vote_data["blockIndex"] == 2

    # Attempting to re-use spent token -> 401 Unauthorized
    vote_spent_res = client.post(
        "/api/votes",
        json={"electionId": "el-01", "candidateId": "cand-02", "votingSessionToken": session_token1},
        headers=voter_headers
    )
    assert vote_spent_res.status_code == 401

    # Obtains NEW face voting session token and attempts 2nd vote -> HTTP 409 CONFLICT!
    face_res2 = client.post("/api/face/verify", json={"electionId": "el-01"}, headers=voter_headers).json()
    session_token2 = face_res2["votingSessionToken"]

    vote_res2 = client.post(
        "/api/votes",
        json={"electionId": "el-01", "candidateId": "cand-02", "votingSessionToken": session_token2},
        headers=voter_headers
    )
    assert vote_res2.status_code == 409
    assert "already cast a ballot" in vote_res2.json()["error"]["message"]


def test_idempotent_vote_submission():
    voter_headers = get_auth_header("usr-voter-02", "voter")
    idemp_headers = {**voter_headers, "X-Idempotency-Key": "IDEMP-KEY-998811"}

    face_res = client.post("/api/face/verify", json={"electionId": "el-01"}, headers=voter_headers).json()
    session_token = face_res["votingSessionToken"]

    payload = {"electionId": "el-01", "candidateId": "cand-02", "votingSessionToken": session_token}

    # Request 1
    res1 = client.post("/api/votes", json=payload, headers=idemp_headers)
    assert res1.status_code == 200
    tx1 = res1.json()["transactionId"]

    # Duplicate Request 2 with same idempotency key
    res2 = client.post("/api/votes", json=payload, headers=idemp_headers)
    assert res2.status_code == 200
    tx2 = res2.json()["transactionId"]

    assert tx1 == tx2

def test_blockchain_integrity_and_tamper_detection():
    # 1. Check integrity initially -> valid: True
    res1 = client.get("/api/blockchain/verify-integrity")
    assert res1.status_code == 200
    assert res1.json()["valid"] is True

    # 2. Tamper block index 1 via admin
    admin_headers = get_auth_header("usr-admin-01", "admin")
    tamper_res = client.post("/api/blockchain/tamper/1", headers=admin_headers)
    assert tamper_res.status_code == 200

    # 3. Re-verify integrity -> valid: False
    res2 = client.get("/api/blockchain/verify-integrity")
    assert res2.status_code == 200
    assert res2.json()["valid"] is False
    assert 1 in res2.json()["invalid_blocks"]
