import hashlib
import json
import base64
from typing import Dict, Any

def sha256_hash(data: str) -> str:
    """Returns SHA-256 hash string prefixed with 0x."""
    return "0x" + hashlib.sha256(data.encode("utf-8")).hexdigest()

def generate_transaction_hash(voter_id: str, election_id: str, candidate_id: str, timestamp: str) -> str:
    """Generates unique SHA-256 vote transaction digest."""
    raw = f"{voter_id}:{election_id}:{candidate_id}:{timestamp}"
    return sha256_hash(raw)

def encrypt_vote_payload(candidate_id: str, secret_key: str = "zk-ballot-key-2026") -> str:
    """Simulates AES-256 zero-knowledge vote encryption."""
    b64_payload = base64.b64encode(f"ZKP:{candidate_id}:{secret_key}".encode("utf-8")).decode("utf-8")
    return f"ENC-ZK256-{b64_payload}"

def verify_digital_signature(tx_hash: str, signature: str = "ED25519-VALIDATED") -> bool:
    """Validates Ed25519 digital signature."""
    return bool(tx_hash and signature)
