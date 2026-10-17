#!/usr/bin/env python3
"""
Seed Demo Data Script for SecureVote Trust Backend.
Resets database schema and populates deterministic demo admin, voter, election, candidates,
genesis block, and audit logs with Argon2id password hashes.
"""

import sys
import os
import datetime

# Ensure app module is in Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine, Base, SessionLocal
from app.db.models import User, Voter, Election, Candidate, BlockchainBlock, VoteTransaction, AuditLog, FaceEmbedding, VoterElectionState
from app.core.security import get_password_hash
from app.core.audit import record_audit_log

def seed_database():
    print("[+] Resetting SecureVote database schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("[+] Creating Demo Admin user (admin@securevote.org / admin123)...")
        admin = User(
            id="usr-admin-01",
            email="admin@securevote.org",
            name="Dhanashri Pagar",
            password_hash=get_password_hash("admin123"),
            role="admin"
        )
        db.add(admin)

        print("[+] Creating Demo Voter user (aarav.sharma@eci-vote.in / voter123)...")
        voter_user = User(
            id="usr-voter-01",
            email="aarav.sharma@eci-vote.in",
            name="Dr. Aarav Sharma",
            password_hash=get_password_hash("voter123"),
            role="voter"
        )
        db.add(voter_user)

        voter_profile = Voter(
            id="usr-voter-01",
            user_id="usr-voter-01",
            name="Dr. Aarav Sharma",
            email="aarav.sharma@eci-vote.in",
            mobile="+91 98765 43210",
            registered_at=datetime.datetime.utcnow(),
            face_enrolled=True,
            approval="approved",
            voting="not_voted",
            aadhaar_last4="7890",
            aadhaar_verified=True
        )
        db.add(voter_profile)

        print("[+] Storing secure face embedding representation...")
        demo_image = None
        for candidate_path in ["scratch_enrolled.png", "backend/scratch_enrolled.png", "../scratch_enrolled.png"]:
            if os.path.exists(candidate_path):
                import cv2, base64
                mat = cv2.imread(candidate_path)
                if mat is not None:
                    _, buf = cv2.imencode('.png', mat)
                    demo_image = "data:image/png;base64," + base64.b64encode(buf).decode('utf-8')
                    break

        if not demo_image:
            demo_image = (
                "data:image/svg+xml;utf8,"
                "<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'>"
                "<rect width='100' height='100' fill='%231e293b'/>"
                "<circle cx='50' cy='40' r='20' fill='%2338bdf8'/>"
                "<path d='M20 90 Q50 60 80 90' fill='none' stroke='%2338bdf8' stroke-width='10' stroke-linecap='round'/>"
                "</svg>"
            )

        face_emb = FaceEmbedding(
            voter_id="usr-voter-01",
            vector_hash="0x7f9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
            reference="face-ref-usr-voter-01",
            image_data=demo_image
        )
        db.add(face_emb)

        print("[+] Creating Demo Elections...")
        e1 = Election(
            id="el-01",
            name="Lok Sabha Parliamentary General Election 2026",
            description="Constitutional democratic ballot to elect the Member of Parliament (MP) for the constituency.",
            status="voting_open",
            start_at=datetime.datetime.utcnow() - datetime.timedelta(days=1),
            end_at=datetime.datetime.utcnow() + datetime.timedelta(days=3),
            registered_voters=2500,
            votes_cast=0
        )
        e2 = Election(
            id="el-02",
            name="Delhi State Legislative Council Election",
            description="Democratic election for State Legislative Assembly council representatives.",
            status="scheduled",
            start_at=datetime.datetime.utcnow() + datetime.timedelta(days=5),
            end_at=datetime.datetime.utcnow() + datetime.timedelta(days=10),
            registered_voters=1800,
            votes_cast=0
        )
        db.add(e1)
        db.add(e2)

        print("[+] Creating Candidates for Election el-01...")
        c1 = Candidate(
            id="cand-01",
            election_id="el-01",
            name="Dr. Rajeshwar Sharma",
            position="Lok Sabha Member of Parliament",
            manifesto="Championing electoral integrity, digital transparency, and grassroots public development across constitutional constituencies.",
            initials="RS",
            symbol="🪷 Lotus (कमल / BJP)",
            work_history="Spearheaded public audit of civic municipal contracts saving ₹42 Cr in exchequer; commissioned 15MW rooftop solar power across 28 schools; established 8 digital tele-health clinics serving 120,000 citizens; achieved 98.4% verified MPLADS fund utilization.",
            status="active"
        )
        c2 = Candidate(
            id="cand-02",
            election_id="el-01",
            name="Pooja Deshmukh",
            position="Lok Sabha Member of Parliament",
            manifesto="Advancing digital governance infrastructure, sustainable rural electrification, and farmer welfare technology initiatives.",
            initials="PD",
            symbol="✋ Hand (हाथ / INC)",
            work_history="Deployed smart micro-grid solar power systems across 64 agricultural villages; launched Mahila Rozgar micro-credit network supporting 18,500 women self-help groups; established 45 rainwater percolation check-dams recharging regional water tables.",
            status="active"
        )
        c3 = Candidate(
            id="cand-03",
            election_id="el-01",
            name="Vikramaditya Rao",
            position="Lok Sabha Member of Parliament",
            manifesto="Empowering youth skill development, regional economic corridors, and zero-tolerance against public sector corruption.",
            initials="VR",
            symbol="🌾 Ears of Corn & Sickle (हंसिया और गेहूं की बाली / CPI)",
            work_history="Established 6 youth robotics and IT skill training centers with 92% certified placement rate; transitioned 350 urban transit buses to zero-emission EVs; introduced real-time digital whistleblower tracking for government tenders.",
            status="active"
        )
        db.add(c1)
        db.add(c2)
        db.add(c3)

        print("[+] Mining Deterministic Genesis Block...")
        genesis_block = BlockchainBlock(
            index=1,
            hash="0x0000000000000000000000000000000000000000000000000000000000000000",
            previous_hash="0x0000000000000000000000000000000000000000000000000000000000000000",
            timestamp=datetime.datetime.utcnow(),
            transaction_count=0,
            verified=True,
            merkle_root="0x0000000000000000000000000000000000000000000000000000000000000000",
            nonce=1948201,
            digital_signature="GENESIS_BLOCK_RSA_SIGNED"
        )
        db.add(genesis_block)

        print("[+] Recording Cryptographically Chained Audit Logs...")
        events = [
            ("System Engine", "system", "DATABASE_INITIALIZED", "SQLite Engine", "success", "v2.4.0"),
            ("Security Officer", "admin", "SECURITY_POLICY_ENFORCED", "Argon2id + RSA-4096", "success", "NIST-SP-800-63B"),
            ("System Admin", "admin", "ADMIN_ACCOUNT_PROVISIONED", "User:usr-admin-01", "success", "admin@securevote.org"),
            ("System Admin", "admin", "ELECTION_CONFIGURED", "Election:el-01", "success", "Lok Sabha Parliamentary General Election 2026"),
            ("Election Commission", "admin", "CANDIDATE_NOMINATED", "Candidate:cand-01", "success", "Dr. Rajeshwar Sharma (⚖️ Scales of Justice)"),
            ("Election Commission", "admin", "CANDIDATE_NOMINATED", "Candidate:cand-02", "success", "Pooja Deshmukh (🏛️ Progress Pillar)"),
            ("Election Commission", "admin", "CANDIDATE_NOMINATED", "Candidate:cand-03", "success", "Vikramaditya Rao (🦁 Lion Crest)"),
            ("Blockchain Engine", "system", "GENESIS_BLOCK_MINED", "Block:1", "success", "0x0000000000000000000000000000000000000000000000000000000000000000"),
            ("Aadhaar e-KYC Gateway", "system", "VOTER_KYC_VERIFIED", "Voter:usr-voter-01", "success", "UIDAI OTP Instant Auto-Approval"),
        ]

        for actor, role, action, entity, status, reference in events:
            record_audit_log(
                db=db,
                actor=actor,
                role=role,
                action=action,
                entity=entity,
                status=status,
                reference=reference
            )

        db.commit()
        print("[+] Database successfully seeded with deterministic demo data!")
    except Exception as e:
        db.rollback()
        print(f"[-] Error seeding database: {repr(e)}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
