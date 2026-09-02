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
            name="Elena Vance",
            password_hash=get_password_hash("admin123"),
            role="admin"
        )
        db.add(admin)

        print("[+] Creating Demo Voter user (aris.thorne@university.edu / voter123)...")
        voter_user = User(
            id="usr-voter-01",
            email="aris.thorne@university.edu",
            name="Dr. Aris Thorne",
            password_hash=get_password_hash("voter123"),
            role="voter"
        )
        db.add(voter_user)

        voter_profile = Voter(
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
        db.add(voter_profile)

        print("[+] Storing secure face embedding representation...")
        face_emb = FaceEmbedding(
            voter_id="usr-voter-01",
            vector_hash="0x7f9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
            reference="face-ref-usr-voter-01"
        )
        db.add(face_emb)

        print("[+] Creating Demo Elections...")
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

        print("[+] Creating Candidates for Election el-01...")
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

        print("[+] Recording Audit Logs...")
        audit = AuditLog(
            id="log-seed-01",
            actor="System Admin",
            role="admin",
            action="SEED_DATA_INITIALIZED",
            entity="Database",
            status="success",
            reference="v2.4.0"
        )
        db.add(audit)

        db.commit()
        print("[+] Database successfully seeded with deterministic demo data!")
    except Exception as e:
        db.rollback()
        print(f"[-] Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
