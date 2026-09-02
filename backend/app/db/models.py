import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="voter", nullable=False)  # admin | voter
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Voter(Base):
    __tablename__ = "voters"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    mobile = Column(String, nullable=True)
    registered_at = Column(DateTime, default=datetime.datetime.utcnow)
    face_enrolled = Column(Boolean, default=False)
    approval = Column(String, default="pending")  # pending | approved | rejected | suspended
    voting = Column(String, default="not_voted")  # not_voted | vote_recorded
    last_login_at = Column(DateTime, nullable=True)

class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    voter_id = Column(String, primary_key=True, index=True)
    vector_hash = Column(Text, nullable=False)
    reference = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Election(Base):
    __tablename__ = "elections"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String, default="scheduled")  # draft | scheduled | voting_open | voting_closed | results_published
    start_at = Column(DateTime, nullable=False)
    end_at = Column(DateTime, nullable=False)
    registered_voters = Column(Integer, default=0)
    votes_cast = Column(Integer, default=0)

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String, primary_key=True, index=True)
    election_id = Column(String, ForeignKey("elections.id"), nullable=False)
    name = Column(String, nullable=False)
    position = Column(String, nullable=False)
    manifesto = Column(Text, nullable=False)
    initials = Column(String, nullable=False)
    status = Column(String, default="active")  # active | withdrawn

class VoteRecord(Base):
    __tablename__ = "vote_records"

    id = Column(String, primary_key=True, index=True)
    election_id = Column(String, ForeignKey("elections.id"), nullable=False)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    voter_id = Column(String, ForeignKey("voters.id"), nullable=False)
    transaction_id = Column(String, nullable=False)
    encrypted_choice = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class BlockchainBlock(Base):
    __tablename__ = "blockchain_blocks"

    index = Column(Integer, primary_key=True, index=True)
    hash = Column(String, nullable=False)
    previous_hash = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    transaction_count = Column(Integer, default=0)
    verified = Column(Boolean, default=True)
    merkle_root = Column(String, nullable=False)
    nonce = Column(Integer, default=0)

class VoteTransaction(Base):
    __tablename__ = "vote_transactions"

    transaction_id = Column(String, primary_key=True, index=True)
    election_id = Column(String, ForeignKey("elections.id"), nullable=False)
    block_index = Column(Integer, ForeignKey("blockchain_blocks.index"), nullable=False)
    block_hash = Column(String, nullable=False)
    previous_hash = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    signature_valid = Column(Boolean, default=True)
    verified = Column(Boolean, default=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    actor = Column(String, nullable=False)
    role = Column(String, nullable=False)
    action = Column(String, nullable=False)
    entity = Column(String, nullable=False)
    status = Column(String, default="success")  # success | warning | failure
    source = Column(String, default="FastAPI Node")
    reference = Column(String, nullable=False)
