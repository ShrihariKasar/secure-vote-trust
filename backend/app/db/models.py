import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="voter", nullable=False, index=True)  # admin | voter
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

class Voter(Base):
    __tablename__ = "voters"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    mobile = Column(String, nullable=True)
    registered_at = Column(DateTime, default=datetime.datetime.utcnow)
    face_enrolled = Column(Boolean, default=False)
    approval = Column(String, default="pending", index=True)  # pending | approved | rejected | suspended
    voting = Column(String, default="not_voted")  # not_voted | vote_recorded
    last_login_at = Column(DateTime, nullable=True)

class VoterElectionState(Base):
    __tablename__ = "voter_election_states"
    __table_args__ = (
        UniqueConstraint("voter_id", "election_id", name="uq_voter_election"),
        Index("idx_voter_election", "voter_id", "election_id"),
    )

    id = Column(String, primary_key=True, index=True)
    voter_id = Column(String, ForeignKey("voters.id"), nullable=False, index=True)
    election_id = Column(String, ForeignKey("elections.id"), nullable=False, index=True)
    has_voted = Column(Boolean, default=True, nullable=False)
    voted_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

class VotingSession(Base):
    __tablename__ = "voting_sessions"

    id = Column(String, primary_key=True, index=True)
    session_token = Column(String, unique=True, index=True, nullable=False)
    voter_id = Column(String, ForeignKey("voters.id"), nullable=False, index=True)
    election_id = Column(String, ForeignKey("elections.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    is_spent = Column(Boolean, default=False, nullable=False, index=True)

class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"
    __table_args__ = (
        UniqueConstraint("idempotency_key", "voter_id", name="uq_idempotency_voter"),
    )

    id = Column(String, primary_key=True, index=True)
    idempotency_key = Column(String, nullable=False, index=True)
    voter_id = Column(String, ForeignKey("voters.id"), nullable=False, index=True)
    status_code = Column(Integer, nullable=False)
    response_body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    voter_id = Column(String, primary_key=True, index=True)
    vector_hash = Column(Text, nullable=False)
    reference = Column(String, nullable=False)
    image_data = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Election(Base):
    __tablename__ = "elections"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String, default="scheduled", index=True)  # draft | scheduled | voting_open | voting_closed | results_published
    start_at = Column(DateTime, nullable=False, index=True)
    end_at = Column(DateTime, nullable=False, index=True)
    registered_voters = Column(Integer, default=0)
    votes_cast = Column(Integer, default=0)

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String, primary_key=True, index=True)
    election_id = Column(String, ForeignKey("elections.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    position = Column(String, nullable=False)
    manifesto = Column(Text, nullable=False)
    initials = Column(String, nullable=False)
    status = Column(String, default="active", index=True)  # active | withdrawn

class VoteRecord(Base):
    __tablename__ = "vote_records"

    id = Column(String, primary_key=True, index=True)
    election_id = Column(String, ForeignKey("elections.id"), nullable=False, index=True)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False, index=True)
    voter_id = Column(String, ForeignKey("voters.id"), nullable=False, index=True)
    transaction_id = Column(String, nullable=False, index=True)
    encrypted_choice = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

class BlockchainBlock(Base):
    __tablename__ = "blockchain_blocks"

    index = Column(Integer, primary_key=True, index=True)
    hash = Column(String, nullable=False, index=True)
    previous_hash = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    transaction_count = Column(Integer, default=0)
    verified = Column(Boolean, default=True)
    merkle_root = Column(String, nullable=False)
    nonce = Column(Integer, default=0)
    digital_signature = Column(Text, nullable=True)
    version = Column(String, default="v2.4")

class VoteTransaction(Base):
    __tablename__ = "vote_transactions"

    transaction_id = Column(String, primary_key=True, index=True)
    election_id = Column(String, ForeignKey("elections.id"), nullable=False, index=True)
    block_index = Column(Integer, ForeignKey("blockchain_blocks.index"), nullable=False, index=True)
    block_hash = Column(String, nullable=False)
    previous_hash = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    signature_valid = Column(Boolean, default=True)
    verified = Column(Boolean, default=True)
    digital_signature = Column(Text, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    actor = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False, index=True)
    entity = Column(String, nullable=False)
    status = Column(String, default="success", index=True)  # success | warning | failure
    source = Column(String, default="FastAPI Node")
    reference = Column(String, nullable=False)
    previous_hash = Column(String, nullable=True)
    current_hash = Column(String, nullable=True, index=True)

