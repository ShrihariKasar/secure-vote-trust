# SecureVote Trust — Production-Grade Blockchain Voting Engine with Face Authentication

**SecureVote Trust** is an academic/project demonstration system engineered to demonstrate **Zero-Trust Cryptographic Voting Architecture**. It combines a modern React 19 frontend with a robust FastAPI (Python 3.10) backend, Argon2id password hashing, MediaPipe facial liveness verification, AES-256-GCM ballot encryption, RSA digital signatures, SHA-256 local blockchain immutability, and tamper-evident hash-chained audit logging.

> **Academic & Project Demonstration Notice**: This platform is designed for research, project presentation, and educational security demonstrations. It is NOT intended for governmental state or federal elections.

---

## Technical Features

### 🔒 1. Zero-Trust Security Architecture
- **Argon2id Password Hashing**: Passwords stored exclusively via Argon2id. Plaintext passwords never reach storage or logs.
- **JWT Session Tokens**: Role-based short-lived access tokens (`exp`, `sub`, `role`).
- **Throttling & Lockout**: 5 failed login attempts trigger temporary 15-minute IP/user lockout (`HTTP 429 Too Many Requests`).
- **RBAC Enforcement**: Server-side FastAPI authorization dependencies (`require_role("admin")`, `require_role("voter")`).

### 👤 2. Privacy-Preserving Facial Liveness Authentication
- **Biometric Vault Isolation**: Raw camera images and face embedding vectors are processed in-memory and NEVER returned in API payloads, stored in JWT tokens, or logged.
- **Liveness Detection**: Multi-point framing, blink, and head movement checks prevent deepfake or static photo spoofing.
- **Short-Lived Voting Sessions**: Successful face authentication yields a 15-minute `VotingSessionToken` which is invalidated upon ballot casting.

### 🗳️ 3. Atomic 16-Step Voting & Double-Vote Protection
- **Multi-Layer Double-Vote Prevention**:
  - DB-level composite unique constraint `(voter_id, election_id)` in `VoterElectionState` table.
  - Duplicate vote attempts return **`HTTP 409 Conflict`**.
- **Ballot Encryption**: Candidate selections are encrypted using **AES-256-GCM** prior to ledger mining.
- **Digital Signatures**: Transaction digests are signed with server-side **RSA 2048-bit Private Key**.
- **Idempotency Engine**: `X-Idempotency-Key` header handling prevents duplicate broadcast under network retries.

### ⛓️ 4. Monotonic Persistent Blockchain Engine
- Monotonic block height, SHA-256 header hashing, Merkle Tree transaction root computation.
- Chain integrity verification endpoint `/api/blockchain/verify-integrity`.
- Admin block tampering test endpoint `/api/blockchain/tamper/{block_index}` to demonstrate instant ledger compromise detection.

### 📜 5. Tamper-Evident Audit Trail
- Every security-sensitive action creates a log entry chained to previous log entries via `previous_hash` and `current_hash`.
- Exportable to standard CSV format.

---

## 🏗️ Project Architecture & Structure

```
secure-vote-trust/
├── backend/
│   ├── app/
│   │   ├── core/           # Security (Argon2id, JWT, RBAC) & Crypto (AES-256-GCM, RSA, SHA-256)
│   │   ├── db/             # SQLAlchemy models (VoterElectionState, VotingSession, BlockchainBlock)
│   │   ├── services/       # Blockchain engine, Face verification service
│   │   ├── routers/        # Auth, Voters, Face, Votes, Elections, Candidates, Blockchain, Audit, Health
│   │   ├── config.py       # Pydantic Settings V2 configuration
│   │   └── main.py         # FastAPI application entry & global exception handlers
│   ├── tests/
│   │   └── test_voting_system.py  # Pytest suite testing security, RBAC, double voting (409), tamper detection
│   ├── seed_demo_data.py   # Deterministic database seeder
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Production Uvicorn backend image
├── src/                    # React 19 Frontend
│   ├── components/         # Design system & UI components
│   ├── lib/                # API client with JWT bearer header & idempotency key injection
│   ├── routes/             # TanStack Router page views
│   └── services/           # Service abstraction layer connecting to FastAPI backend
├── docs/                   # Technical Documentation
│   ├── ARCHITECTURE.md     # Sequence diagrams & data flow
│   ├── SECURITY.md         # Security controls & cryptographic specifications
│   └── PRIVACY.md          # Biometric non-retention & ballot secrecy policies
├── Dockerfile              # Production Nginx frontend image
├── docker-compose.yml      # Multi-container orchestration
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ & `npm`
- **Python**: 3.10+
- **Docker & Docker Compose** (Optional for containerized run)

---

### Method A: Local Development Setup

#### 1. Start FastAPI Backend & Seed Database

```bash
# Navigate to workspace root
cd secure-vote-trust

# Install Python dependencies
pip install -r backend/requirements.txt

# Reset and seed SQLite database with demo data
python backend/seed_demo_data.py

# Run FastAPI backend server (Port 8000)
$env:PYTHONPATH="backend"
python -m uvicorn app.main:app --reload --port 8000
```

#### 2. Run Automated Pytest Test Suite

```bash
$env:PYTHONPATH="backend"
python -m pytest backend/tests/test_voting_system.py -v
```

#### 3. Start React Frontend

```bash
# In a second terminal:
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

### Method B: Docker Compose Deployment

```bash
docker-compose up --build
```
- Frontend: `http://localhost`
- Backend API Docs (Swagger): `http://localhost:8000/docs`

---

## 🔑 Demo Login Personas

| Role | Username / Identifier | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Voter Persona** | `usr-voter-01` or `aris.thorne@university.edu` | `VoterPass123!` | Vote in active election, view ballot receipt |
| **Admin Persona** | `usr-admin-01` or `admin@securevote.org` | `AdminPass123!` | Manage elections, candidates, voter approvals, blockchain audit |

---

## 📄 License & Academic Disclaimer

Designed and implemented for **SecureVote Trust**. Built for academic evaluation and technical demonstration.
