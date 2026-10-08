from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from tests.test_voting_system import setup_db, engine, TestingSessionLocal

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_demo_endpoint_disabled_and_real_login():
    # Verify demo endpoint is strictly disabled (HTTP 403)
    demo_resp = client.post("/api/auth/demo?role=voter")
    assert demo_resp.status_code == 403

    # Real authentication succeeds
    login_resp = client.post("/api/auth/login", json={
        "identifier": "aris.thorne@university.edu",
        "password": "voter123"
    })
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert token_data["user"]["role"] == "voter"
    assert token_data["user"]["name"] == "Dr. Aris Thorne"
    assert "access_token" in token_data

def test_list_elections():
    response = client.get("/api/elections")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

def test_double_voting_prevention_409():
    voter_id = "test-voter-double-vote"
    
    # Register test voter
    reg_resp = client.post("/api/voters/register", json={
        "fullName": "Test Voter Double",
        "voterId": voter_id,
        "email": "testdouble@securevote.org",
        "mobile": "+15550001111",
        "password": "password"
    })
    assert reg_resp.status_code == 200

    # Approve voter as admin
    admin_token = create_access_token("usr-admin-01", "admin")
    approve_resp = client.patch(
        f"/api/admin/voters/{voter_id}/approve",
        json={"approval": "approved"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert approve_resp.status_code == 200

    # Log in as the approved voter
    login_resp = client.post("/api/auth/login", json={
        "identifier": "testdouble@securevote.org",
        "password": "password"
    })
    assert login_resp.status_code == 200
    voter_token = login_resp.json()["access_token"]
    voter_headers = {"Authorization": f"Bearer {voter_token}"}

    vote_payload = {
        "electionId": "el-01",
        "candidateId": "cand-01",
        "voterId": voter_id
    }

    # First vote attempt -> success (200)
    vote1 = client.post("/api/votes", json=vote_payload, headers=voter_headers)
    assert vote1.status_code == 200
    assert "transactionId" in vote1.json()

    # Second vote attempt -> HTTP 409 Conflict
    vote2 = client.post("/api/votes", json=vote_payload, headers=voter_headers)
    assert vote2.status_code == 409
    detail_msg = vote2.json().get("detail") or vote2.json().get("error", {}).get("message", "")
    assert "already cast" in detail_msg.lower() or "already voted" in detail_msg.lower()

def test_blockchain_integrity():
    response = client.get("/api/blockchain/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["integrity"] == "verified"
    assert data["total"] >= 1

def test_audit_logs():
    admin_token = create_access_token("usr-admin-01", "admin")
    response = client.get("/api/audit-logs", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
