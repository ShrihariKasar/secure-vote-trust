# System Architecture Specification

## SecureVote Trust Architecture

This document describes the technical design, data flows, and component interactions of the **Blockchain Voting with Face Authentication** platform.

```mermaid
sequenceDiagram
    autonumber
    actor Voter as Voter (Client UI)
    participant Auth as FastAPI Auth Module
    participant Face as Face Liveness Service
    participant Engine as Voting Engine
    participant DB as SQLite DB
    participant BC as Local Blockchain Engine

    Voter->>Auth: POST /api/auth/login (Argon2id Credentials)
    Auth-->>Voter: JWT Bearer Access Token

    Voter->>Face: POST /api/face/verify (Biometric Liveness Image)
    Face->>DB: Compare vector representation & Liveness check
    Face-->>Voter: Short-Lived Voting Session Token (15m Expire)

    Voter->>Engine: POST /api/votes (Candidate ID + Voting Session Token + X-Idempotency-Key)
    Engine->>DB: Check voter_election_states (409 Conflict if already voted)
    Engine->>Engine: Encrypt Vote Payload (AES-256-GCM)
    Engine->>Engine: Generate SHA-256 Digest & Sign with RSA Private Key
    Engine->>BC: Mine New Block (Index N, PrevHash, MerkleRoot, RSA Sig)
    BC->>DB: Persist Block & Transaction
    Engine->>DB: Invalidate Voting Session Token & Record Audit Log
    Engine-->>Voter: Vote Transaction Receipt (Block Index, Hash, Signature)
```

## Component Architecture

1. **Frontend**: React 19 + TanStack Router + TailwindCSS.
2. **Backend**: FastAPI (Python 3.10+) running Uvicorn.
3. **Database**: SQLite with SQLAlchemy ORM.
   - Enforces `VoterElectionState` composite unique constraint `(voter_id, election_id)`.
4. **Biometric Vault**: Facial landmark vector processing with MediaPipe/OpenCV liveness detection.
   - Face embeddings and raw images are NEVER returned in API responses or written to logs.
5. **Local Blockchain Engine**:
   - Monotonic persistent ledger with deterministic Genesis block.
   - SHA-256 transaction digests, Merkle root calculation, RSA 2048-bit Digital Signatures.
6. **Audit Trail**: Tamper-evident immutable audit log stream with previous/current hash chaining.
