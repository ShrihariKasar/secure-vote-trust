from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_login_demo():
    response = client.post("/api/auth/demo?role=voter")
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "voter"
    assert data["name"] == "Dr. Aris Thorne"

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

    vote_payload = {
        "electionId": "el-01",
        "candidateId": "cand-01",
        "voterId": voter_id
    }

    # First vote attempt -> success (200)
    vote1 = client.post("/api/votes", json=vote_payload)
    assert vote1.status_code == 200
    assert "transactionId" in vote1.json()

    # Second vote attempt -> HTTP 409 Conflict
    vote2 = client.post("/api/votes", json=vote_payload)
    assert vote2.status_code == 409
    assert "already voted" in vote2.json()["detail"].lower()

def test_blockchain_integrity():
    response = client.get("/api/blockchain/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["integrity"] == "verified"
    assert data["total"] >= 1

def test_audit_logs():
    response = client.get("/api/audit-logs")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
