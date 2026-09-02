# Security Architecture & Controls

## Security Philosophy

The **SecureVote Trust Engine** is engineered following **Zero-Trust Security Principles**. Security mechanisms are enforced exclusively at the authoritative FastAPI backend layer.

---

## 1. Authentication & Session Management

- **Password Storage**: Passwords are never stored in plaintext. Hashing is executed using **Argon2id** (via `passlib[argon2]`).
- **Login Throttling & Lockout**: Repeated login failures (5 consecutive failures within a 15-minute window) trigger temporary account throttling (`HTTP 429 Too Many Requests`).
- **Session Tokens**: Authentication issues short-lived **JWT Access Tokens** containing user claims (`sub`, `role`, `exp`, `iat`).
- **Biometric Voting Sessions**: Upon successful facial liveness verification, the backend issues a short-lived **Voting Session Token** (valid for 15 minutes). Once a ballot is cast, this token is invalidated (`is_spent = True`).

---

## 2. Multi-Layer Double-Vote Prevention

Double voting is prevented across four distinct architectural layers:

1. **Frontend UX**: The UI disables submit buttons and indicates voted status.
2. **Backend Session Validation**: Spent voting session tokens are rejected (`401`).
3. **Database Uniqueness Constraint**: The `voter_election_states` table enforces a composite unique key `(voter_id, election_id)`. Race conditions or duplicate attempts trigger a database `IntegrityError` resulting in **`HTTP 409 Conflict`**.
4. **Idempotency Engine**: Requests with an `X-Idempotency-Key` header return cached transaction receipts rather than executing duplicate operations.

---

## 3. Cryptographic Ballot Secrecy & Digital Signatures

- **Ballot Encryption**: Candidate selection is encrypted using **AES-256-GCM** authenticated encryption prior to ledger mining.
- **Digital Signatures**: Transaction digests are calculated via SHA-256 and signed with server-side **RSA 2048-bit Private Keys**.
- **Ballot Secrecy**: Transaction records separate voter identity from encrypted ballot contents so public blockchain queries cannot map voters to candidate choices.

---

## 4. Blockchain Integrity Verification

- Monotonic block linking (`previous_hash == prev_block.hash`).
- Merkle Tree transaction root computation.
- `/api/blockchain/verify-integrity` API performs re-verification of all block hashes, linkages, and digital signatures.

---

## 5. Audit Trail & Log Protection

- All security-sensitive actions generate immutable audit log records.
- Passwords, JWT secrets, raw images, and facial embeddings are strictly excluded from log entries.
