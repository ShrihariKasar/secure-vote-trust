import hashlib
import json
import base64
import os
from typing import Dict, Any, Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from app.config import settings

# Global Server-side RSA Key Pair for Digital Signatures (Persisted across restarts)
_RSA_PRIVATE_KEY = None
_RSA_PUBLIC_KEY = None
RSA_KEY_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "rsa_private_key.pem")

def get_rsa_keypair() -> Tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey]:
    """Generates or retrieves the authoritative server RSA 2048 signing key pair (persisted to disk)."""
    global _RSA_PRIVATE_KEY, _RSA_PUBLIC_KEY
    if _RSA_PRIVATE_KEY is None:
        key_path = os.path.abspath(RSA_KEY_PATH)
        if os.path.exists(key_path):
            try:
                with open(key_path, "rb") as f:
                    _RSA_PRIVATE_KEY = serialization.load_pem_private_key(f.read(), password=None)
                _RSA_PUBLIC_KEY = _RSA_PRIVATE_KEY.public_key()
            except Exception:
                _RSA_PRIVATE_KEY = None
        
        if _RSA_PRIVATE_KEY is None:
            _RSA_PRIVATE_KEY = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
            )
            _RSA_PUBLIC_KEY = _RSA_PRIVATE_KEY.public_key()
            try:
                pem = _RSA_PRIVATE_KEY.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                )
                with open(key_path, "wb") as f:
                    f.write(pem)
            except Exception:
                pass
    return _RSA_PRIVATE_KEY, _RSA_PUBLIC_KEY

def canonical_serialize(data: Dict[str, Any]) -> str:
    """Produces deterministic canonical JSON string for hashing and signing."""
    return json.dumps(data, sort_keys=True, separators=(',', ':'))

def sha256_hash(data: str) -> str:
    """Returns SHA-256 hex digest prefixed with 0x."""
    return "0x" + hashlib.sha256(data.encode("utf-8")).hexdigest()

def generate_transaction_hash(voter_id: str, election_id: str, candidate_id: str, timestamp: str) -> str:
    """Generates unique SHA-256 vote transaction digest from canonical structure."""
    payload = {
        "voter_id": voter_id,
        "election_id": election_id,
        "candidate_id": candidate_id,
        "timestamp": timestamp
    }
    return sha256_hash(canonical_serialize(payload))

def get_aes_key() -> bytes:
    """Derives a 256-bit AES key from system config."""
    key_bytes = settings.AES_SECRET_KEY.encode("utf-8")
    return hashlib.sha256(key_bytes).digest()

def encrypt_vote_payload(candidate_id: str) -> str:
    """Encrypts candidate choice payload using AES-256-GCM authenticated encryption."""
    key = get_aes_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    data = json.dumps({"candidate_id": candidate_id, "timestamp": os.urandom(4).hex()}).encode("utf-8")
    ct = aesgcm.encrypt(nonce, data, None)
    payload_b64 = base64.b64encode(nonce + ct).decode("utf-8")
    return f"ENC-AES256GCM-{payload_b64}"

def decrypt_vote_payload(encrypted_str: str) -> str:
    """Decrypts candidate choice payload from AES-256-GCM string."""
    try:
        if not encrypted_str.startswith("ENC-AES256GCM-"):
            return "DECRYPTION_FAILED"
        raw_b64 = encrypted_str.replace("ENC-AES256GCM-", "")
        raw_bytes = base64.b64decode(raw_b64)
        nonce = raw_bytes[:12]
        ct = raw_bytes[12:]
        key = get_aes_key()
        aesgcm = AESGCM(key)
        pt = aesgcm.decrypt(nonce, ct, None)
        data = json.loads(pt.decode("utf-8"))
        return data.get("candidate_id", "DECRYPTION_FAILED")
    except Exception:
        return "DECRYPTION_FAILED"

def sign_transaction(tx_hash: str) -> str:
    """Signs transaction hash using server RSA private key."""
    private_key, _ = get_rsa_keypair()
    signature = private_key.sign(
        tx_hash.encode("utf-8"),
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    return base64.b64encode(signature).decode("utf-8")

def verify_digital_signature(tx_hash: str, signature_b64: str) -> bool:
    """Verifies RSA digital signature for given transaction hash."""
    try:
        _, public_key = get_rsa_keypair()
        sig_bytes = base64.b64decode(signature_b64)
        public_key.verify(
            sig_bytes,
            tx_hash.encode("utf-8"),
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return True
    except Exception:
        return False

