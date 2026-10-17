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
        "identifier": "aarav.sharma@eci-vote.in",
        "password": "voter123"
    })
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert token_data["user"]["role"] == "voter"
    assert token_data["user"]["name"] == "Dr. Aarav Sharma"
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
    assert len(data) >= 1
    assert "currentHash" in data[0]

def test_audit_chain_integrity_endpoint():
    admin_token = create_access_token("usr-admin-01", "admin")
    response = client.get("/api/audit-logs/verify-chain", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["integrity"] == "verified"
    assert data["totalLogs"] >= 1
    assert data["chainHeadHash"] is not None

def test_observer_consensus_endpoint():
    response = client.get("/api/blockchain/consensus")
    assert response.status_code == 200
    data = response.json()
    assert data["quorumStatus"] == "CONSENSUS_REACHED"
    assert data["activeNodes"] == 4
    assert len(data["observerNodes"]) == 4

def test_aadhaar_dynamic_otp_and_verhoeff():
    from app.core.verhoeff import generate_valid_aadhaar_with_checksum
    valid_aadhaar = generate_valid_aadhaar_with_checksum("54892019481")
    
    # 1. Dispatch OTP
    send_resp = client.post("/api/voters/aadhaar/send-otp", json={"aadhaarNumber": valid_aadhaar})
    assert send_resp.status_code == 200
    send_data = send_resp.json()
    assert send_data["success"] is True
    assert send_data["verhoeffValid"] is True
    assert len(send_data["demoOtp"]) == 6
    
    # 2. Verify with dynamic OTP
    verify_resp = client.post("/api/voters/aadhaar/verify-otp", json={
        "aadhaarNumber": valid_aadhaar,
        "otp": send_data["demoOtp"]
    })
    assert verify_resp.status_code == 200
    assert verify_resp.json()["verified"] is True

def test_assistant_chat_endpoint():
    # 1. Technical query
    tech_resp = client.post("/api/assistant/chat", json={
        "query": "explain verhoeff checksum algorithm and sha-256 chaining"
    })
    assert tech_resp.status_code == 200
    assert tech_resp.json()["tone"] == "technical"
    assert "Verhoeff" in tech_resp.json()["answer"]
    assert len(tech_resp.json()["suggestedQuestions"]) >= 1

    # 2. Simple query
    simple_resp = client.post("/api/assistant/chat", json={
        "query": "explain simply how voting works"
    })
    assert simple_resp.status_code == 200
    assert simple_resp.json()["tone"] == "simple"

    # 3. Security query
    sec_resp = client.post("/api/assistant/chat", json={
        "query": "can an admin rig or cheat the election?"
    })
    assert sec_resp.status_code == 200
    assert sec_resp.json()["tone"] == "security"

    # 4. Voter asking for admin login -> strictly blocked
    voter_admin_query = client.post("/api/assistant/chat", json={
        "query": "how do I login as admin and what is the admin dashboard credentials?",
        "userRole": "voter"
    })
    assert voter_admin_query.status_code == 200
    assert voter_admin_query.json()["tone"] == "restricted"
    assert "Administrative Boundary" in voter_admin_query.json()["answer"]

    # 5. Authenticated voter querying their own personal voter data
    from app.db.session import SessionLocal
    from app.db.models import User
    from app.core.security import create_access_token
    db = SessionLocal()
    voter_user = db.query(User).filter(User.role == "voter").first()
    if voter_user:
        token = create_access_token(voter_user.id, "voter")
        my_data_resp = client.post(
            "/api/assistant/chat",
            json={"query": "What is my voter status and show my data?"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert my_data_resp.status_code == 200
        assert voter_user.name in my_data_resp.json()["answer"]
        assert "Aadhaar e-KYC" in my_data_resp.json()["answer"]

    # 6. Admin querying voter secret ballot choices -> strictly blocked by zero-knowledge secrecy
    admin_user = db.query(User).filter(User.role == "admin").first()
    if admin_user:
        admin_token = create_access_token(admin_user.id, "admin")
        privacy_resp = client.post(
            "/api/assistant/chat",
            json={"query": "Who did voter aarav.sharma vote for and show ballot?"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert privacy_resp.status_code == 200
        assert "Confidential Ballot Secrecy Enforced" in privacy_resp.json()["answer"]

        # Admin querying admin operations -> allowed
        ops_resp = client.post(
            "/api/assistant/chat",
            json={"query": "Explain admin dashboard controls, batch approval and observer consensus"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert ops_resp.status_code == 200
        assert "Administrator Operations" in ops_resp.json()["answer"]
    db.close()



