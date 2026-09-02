"""
System QA Execution and Empirical Audit Script for SecureVote Trust
"""
import sys
import json
import time
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.db.models import User, Voter, Election, Candidate, BlockchainBlock, VoteTransaction, AuditLog, VoterElectionState
from app.core.security import get_password_hash, verify_password, create_access_token
from app.services.blockchain_service import blockchain_engine
from app.core.crypto import encrypt_vote_payload, decrypt_vote_payload, verify_digital_signature, sign_transaction, sha256_hash

client = TestClient(app)

results = []

def record(test_id, category, feature, priority, status, expected, actual, error="", root_cause="", recommendation=""):
    results.append({
        "test_id": test_id,
        "category": category,
        "feature": feature,
        "priority": priority,
        "status": status,
        "expected": expected,
        "actual": actual,
        "error": error,
        "root_cause": root_cause,
        "recommendation": recommendation
    })
    print(f"[{status}] {test_id}: {feature}")

def run_qa_audit():
    print("==================================================")
    print("STARTING COMPREHENSIVE END-TO-END QA AUDIT")
    print("==================================================")
    from seed_demo_data import seed_database
    seed_database()

    # 1. PHASE 0 — Health
    try:
        res = client.get("/api/health")
        if res.status_code == 200 and res.json().get("api") == "ok":
            record("TC-HEALTH-01", "API Health", "Public Health Check Endpoint", "CRITICAL", "PASS", "HTTP 200 OK with api: ok", f"HTTP {res.status_code} {res.json()}")
        else:
            record("TC-HEALTH-01", "API Health", "Public Health Check Endpoint", "CRITICAL", "FAIL", "HTTP 200 OK", f"HTTP {res.status_code}")
    except Exception as e:
        record("TC-HEALTH-01", "API Health", "Public Health Check Endpoint", "CRITICAL", "FAIL", "HTTP 200 OK", str(e))

    # Admin System Health Overview
    try:
        admin_token = create_access_token("usr-admin-01", "admin")
        res = client.get("/api/admin/system/health", headers={"Authorization": f"Bearer {admin_token}"})
        if res.status_code == 200 and res.json().get("api") == "Operational":
            record("TC-HEALTH-02", "API Health", "Admin Detailed Health Overview", "HIGH", "PASS", "HTTP 200 with component health map", f"HTTP {res.status_code}")
        else:
            record("TC-HEALTH-02", "API Health", "Admin Detailed Health Overview", "HIGH", "FAIL", "HTTP 200 OK", f"HTTP {res.status_code}")
    except Exception as e:
        record("TC-HEALTH-02", "API Health", "Admin Detailed Health Overview", "HIGH", "FAIL", "HTTP 200 OK", str(e))

    # 2. PHASE 4 — AUTHENTICATION BASIC
    # Valid Admin Login
    res = client.post("/api/auth/login", json={"identifier": "admin@securevote.org", "password": "admin123", "role": "admin"})
    if res.status_code == 200 and "access_token" in res.json():
        record("TC-AUTH-01", "Authentication", "Admin Login Valid Credentials", "CRITICAL", "PASS", "JWT token issued", "Token received successfully")
    else:
        record("TC-AUTH-01", "Authentication", "Admin Login Valid Credentials", "CRITICAL", "FAIL", "JWT token issued", f"HTTP {res.status_code}")

    # Invalid Admin Password
    res = client.post("/api/auth/login", json={"identifier": "admin@securevote.org", "password": "WrongPassword!", "role": "admin"})
    if res.status_code == 401:
        record("TC-AUTH-02", "Authentication", "Invalid Password Handling", "HIGH", "PASS", "HTTP 401 Unauthorized", f"HTTP {res.status_code}")
    else:
        record("TC-AUTH-02", "Authentication", "Invalid Password Handling", "HIGH", "FAIL", "HTTP 401 Unauthorized", f"HTTP {res.status_code}")

    # Login Lockout Throttling (5 attempts)
    lockout_passed = False
    for i in range(5):
        client.post("/api/auth/login", json={"identifier": "lockout_test@securevote.org", "password": "wrong", "role": "voter"})
    res = client.post("/api/auth/login", json={"identifier": "lockout_test@securevote.org", "password": "wrong", "role": "voter"})
    if res.status_code == 429:
        record("TC-AUTH-03", "Authentication", "Login Throttling & Lockout", "CRITICAL", "PASS", "HTTP 429 Too Many Requests after 5 failures", f"HTTP {res.status_code}")
    else:
        record("TC-AUTH-03", "Authentication", "Login Throttling & Lockout", "CRITICAL", "FAIL", "HTTP 429", f"HTTP {res.status_code}")

    # 3. PHASE 5 — AUTHORIZATION & RBAC
    voter_token = create_access_token("usr-voter-01", "voter")
    res = client.get("/api/admin/voters", headers={"Authorization": f"Bearer {voter_token}"})
    if res.status_code == 403:
        record("TC-RBAC-01", "Authorization", "Voter Access to Admin Endpoint Blocked", "CRITICAL", "PASS", "HTTP 403 Forbidden", f"HTTP {res.status_code}")
    else:
        record("TC-RBAC-01", "Authorization", "Voter Access to Admin Endpoint Blocked", "CRITICAL", "FAIL", "HTTP 403 Forbidden", f"HTTP {res.status_code}")

    res = client.get("/api/admin/voters") # Unauthenticated
    if res.status_code == 401:
        record("TC-RBAC-02", "Authorization", "Unauthenticated Request Blocked", "CRITICAL", "PASS", "HTTP 401 Unauthorized", f"HTTP {res.status_code}")
    else:
        record("TC-RBAC-02", "Authorization", "Unauthenticated Request Blocked", "CRITICAL", "FAIL", "HTTP 401 Unauthorized", f"HTTP {res.status_code}")

    # 4. PHASE 7 & 8 — REGISTRATION & BIOMETRIC ENROLLMENT
    reg_payload = {
        "fullName": "QA Audit Test User",
        "voterId": "VTR-QA-9999",
        "email": "qa.audit@university.edu",
        "mobile": "+91 99999 88888",
        "password": "Password123!",
        "faceEnrolled": True
    }
    res = client.post("/api/voters/register", json=reg_payload)
    if res.status_code == 200 and res.json().get("approval") == "pending":
        record("TC-REG-01", "Registration", "Voter Registration Submission", "HIGH", "PASS", "HTTP 200 Pending approval receipt", f"HTTP {res.status_code}")
    else:
        record("TC-REG-01", "Registration", "Voter Registration Submission", "HIGH", "FAIL", "HTTP 200", f"HTTP {res.status_code}")

    # Duplicate Voter ID returns existing registration receipt
    res = client.post("/api/voters/register", json=reg_payload)
    if res.status_code in (200, 400, 409) and res.json().get("voterId") == reg_payload["voterId"]:
        record("TC-REG-02", "Registration", "Duplicate Voter Registration Handling", "HIGH", "PASS", "Idempotent registration receipt returned without duplicating account", f"HTTP {res.status_code} {res.json()}")
    else:
        record("TC-REG-02", "Registration", "Duplicate Voter Registration Handling", "HIGH", "FAIL", "Idempotent receipt", f"HTTP {res.status_code}")


    # 5. PHASE 10 — FACE AUTHENTICATION & VOTING SESSION
    res = client.post("/api/face/verify", json={"electionId": "el-01"}, headers={"Authorization": f"Bearer {voter_token}"})
    if res.status_code == 200 and "votingSessionToken" in res.json():
        voting_session_token = res.json()["votingSessionToken"]
        record("TC-FACE-01", "Biometrics", "Facial Verification Issues Session Token", "CRITICAL", "PASS", "Issued 15-minute voting session token", f"Token received")
    else:
        voting_session_token = None
        record("TC-FACE-01", "Biometrics", "Facial Verification Issues Session Token", "CRITICAL", "FAIL", "Token issued", f"HTTP {res.status_code}")

    # 6. PHASE 19 & 20 — VOTE SUBMISSION & DOUBLE-VOTE PROTECTION
    if voting_session_token:
        vote_payload = {
            "electionId": "el-01",
            "candidateId": "cand-01",
            "votingSessionToken": voting_session_token
        }
        res1 = client.post("/api/votes", json=vote_payload, headers={"Authorization": f"Bearer {voter_token}"})
        if res1.status_code == 200 and res1.json().get("verified") is True:
            record("TC-VOTE-01", "Voting Pipeline", "Atomic Ballot Submission", "CRITICAL", "PASS", "HTTP 200 Verified vote receipt", f"Block index {res1.json().get('blockIndex')}")
        else:
            record("TC-VOTE-01", "Voting Pipeline", "Atomic Ballot Submission", "CRITICAL", "FAIL", "HTTP 200", f"HTTP {res1.status_code}")

        # Re-using spent token -> 401
        res_spent = client.post("/api/votes", json=vote_payload, headers={"Authorization": f"Bearer {voter_token}"})
        if res_spent.status_code == 401:
            record("TC-VOTE-02", "Voting Session", "Spent Token Re-use Invalidation", "CRITICAL", "PASS", "HTTP 401 Unauthorized for spent session token", f"HTTP {res_spent.status_code}")
        else:
            record("TC-VOTE-02", "Voting Session", "Spent Token Re-use Invalidation", "CRITICAL", "FAIL", "HTTP 401", f"HTTP {res_spent.status_code}")

        # Request new session & try double vote -> HTTP 409 CONFLICT
        res_face2 = client.post("/api/face/verify", json={"electionId": "el-01"}, headers={"Authorization": f"Bearer {voter_token}"}).json()
        token2 = res_face2["votingSessionToken"]
        res2 = client.post("/api/votes", json={"electionId": "el-01", "candidateId": "cand-02", "votingSessionToken": token2}, headers={"Authorization": f"Bearer {voter_token}"})
        if res2.status_code == 409:
            record("TC-VOTE-03", "Double Vote Protection", "Duplicate Vote Rejection (HTTP 409)", "CRITICAL", "PASS", "HTTP 409 Conflict VOTER_ALREADY_VOTED", f"HTTP {res2.status_code} {res2.json()}")
        else:
            record("TC-VOTE-03", "Double Vote Protection", "Duplicate Vote Rejection (HTTP 409)", "CRITICAL", "FAIL", "HTTP 409 Conflict", f"HTTP {res2.status_code}")

    # 7. PHASE 22 — IDEMPOTENCY ENGINE (Using fresh approved voter)
    db = SessionLocal()
    v2 = User(id="usr-voter-idemp", email="idemp@university.edu", password_hash=get_password_hash("pass"), name="Idemp Voter", role="voter")
    db.add(v2)
    db.commit()
    voter2_rec = Voter(id="usr-voter-idemp", user_id="usr-voter-idemp", name="Idemp Voter", email="idemp@university.edu", approval="approved", face_enrolled=True)
    db.add(voter2_rec)
    db.commit()
    db.close()

    idemp_voter_token = create_access_token("usr-voter-idemp", "voter")
    idemp_face = client.post("/api/face/verify", json={"electionId": "el-01"}, headers={"Authorization": f"Bearer {idemp_voter_token}"}).json()
    idemp_token = idemp_face["votingSessionToken"]
    
    headers_idemp = {"Authorization": f"Bearer {idemp_voter_token}", "X-Idempotency-Key": "QA-IDEMP-KEY-88221"}
    vote_req = {"electionId": "el-01", "candidateId": "cand-02", "votingSessionToken": idemp_token}
    
    res_idemp1 = client.post("/api/votes", json=vote_req, headers=headers_idemp)
    res_idemp2 = client.post("/api/votes", json=vote_req, headers=headers_idemp)

    if res_idemp1.status_code == 200 and res_idemp2.status_code == 200 and res_idemp1.json()["transactionId"] == res_idemp2.json()["transactionId"]:
        record("TC-IDEMP-01", "Idempotency Engine", "X-Idempotency-Key Cached Receipt", "HIGH", "PASS", "Both calls return identical transaction ID", f"Tx ID {res_idemp1.json()['transactionId']}")
    else:
        record("TC-IDEMP-01", "Idempotency Engine", "X-Idempotency-Key Cached Receipt", "HIGH", "FAIL", "Identical transaction ID", f"Res1 {res_idemp1.status_code}, Res2 {res_idemp2.status_code}")


    # 8. PHASE 28, 29, 30 — CRYPTOGRAPHY, ENCRYPTION & SIGNATURES
    try:
        vote_data = {"voter_id": "usr-voter-01", "candidate_id": "cand-01", "election_id": "el-01"}
        cipher_b64 = encrypt_vote_payload(vote_data)
        decrypted = decrypt_vote_payload(cipher_b64)
        if decrypted == vote_data:
            record("TC-CRYPTO-01", "Cryptography", "AES-256-GCM Encrypted Vote Storage", "CRITICAL", "PASS", "Authenticated encryption & decryption successful", "Payload matches")
        else:
            record("TC-CRYPTO-01", "Cryptography", "AES-256-GCM Encrypted Vote Storage", "CRITICAL", "FAIL", "Match decrypted payload", "Decryption mismatch")
    except Exception as e:
        record("TC-CRYPTO-01", "Cryptography", "AES-256-GCM Encrypted Vote Storage", "CRITICAL", "FAIL", "Encryption success", str(e))

    # RSA Digital Signature Verification
    try:
        tx_hash = sha256_hash("canonical_transaction_payload_0x8831")
        sig = sign_transaction(tx_hash)
        is_valid = verify_digital_signature(tx_hash, sig)
        is_fake_valid = verify_digital_signature("tampered_payload", sig)
        if is_valid and not is_fake_valid:
            record("TC-CRYPTO-02", "Cryptography", "RSA Digital Signature Verification", "CRITICAL", "PASS", "Valid signature verifies; tampered payload fails", "RSA signature validated")
        else:
            record("TC-CRYPTO-02", "Cryptography", "RSA Digital Signature Verification", "CRITICAL", "FAIL", "RSA signature validation", f"is_valid: {is_valid}, is_fake_valid: {is_fake_valid}")
    except Exception as e:
        record("TC-CRYPTO-02", "Cryptography", "RSA Digital Signature Verification", "CRITICAL", "FAIL", "RSA signature", str(e))

    # 9. PHASE 31, 32 — BLOCKCHAIN INTEGRITY & TAMPER DETECTION
    res_integrity1 = client.get("/api/blockchain/verify-integrity")
    if res_integrity1.status_code == 200 and res_integrity1.json().get("valid") is True:
        record("TC-BC-01", "Blockchain Engine", "Chain Integrity Verification (Initial)", "CRITICAL", "PASS", "HTTP 200 Valid: True", "valid: True")
    else:
        record("TC-BC-01", "Blockchain Engine", "Chain Integrity Verification (Initial)", "CRITICAL", "FAIL", "Valid: True", f"{res_integrity1.json()}")

    # Tamper block index 1 via admin
    res_tamper = client.post("/api/blockchain/tamper/1", headers={"Authorization": f"Bearer {admin_token}"})
    res_integrity2 = client.get("/api/blockchain/verify-integrity")
    if res_integrity2.status_code == 200 and res_integrity2.json().get("valid") is False:
        record("TC-BC-02", "Blockchain Engine", "Tamper Detection Trigger", "CRITICAL", "PASS", "HTTP 200 Valid: False upon block modification", "valid: False (Tampering detected)")
    else:
        record("TC-BC-02", "Blockchain Engine", "Tamper Detection Trigger", "CRITICAL", "FAIL", "Valid: False", f"{res_integrity2.json()}")

    print("==================================================")
    print(f"TOTAL TESTED: {len(results)} | PASSED: {len([r for r in results if r['status'] == 'PASS'])}")
    print("==================================================")
    
    with open("backend/tests/qa_execution_log.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_qa_audit()
