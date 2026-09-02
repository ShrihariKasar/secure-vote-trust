# Privacy Architecture & Data Protection

## Biometric & Identity Privacy

**SecureVote Trust** enforces strict data minimization and isolation policies to ensure voter privacy.

---

## 1. Biometric Data Isolation & Non-Retention

- **Raw Facial Images**: Raw face camera frames and uploaded images are processed transiently in volatile memory during liveness verification.
- **No Disk Storage**: Raw facial images are **NEVER** written to disk, database, or persistent object storage.
- **No Vector Exposure**: Face embedding vector representations are calculated server-side and stored in isolated salt-hashed format.
- **API Filtering**: Face embeddings and landmark data are **NEVER** returned in any REST API JSON response, logged to audit trails, or stored in JWT session tokens.

---

## 2. Cryptographic Ballot Anonymity

- **AES-256-GCM Encryption**: The voter's candidate selection is encrypted prior to block mining.
- **Voter ID Separation**: Public ledger block entries store only transaction IDs, Merkle roots, nonces, and digital signatures. The voter's personal identity is decoupled from candidate selection records on the public chain.
- **One-Time Voting Session Tokens**: Biometric facial verification produces a short-lived token (15-minute validity). This token is invalidated immediately upon ballot submission, preventing session hijacking or trace linking.

---

## 3. Compliance & Data Ownership

- **Academic / Project Demonstration**: Intended for academic, organizational, and project evaluation.
- **Audit Transparency**: Voters can verify that their individual vote transaction was included in the ledger without exposing their candidate selection to third parties.
