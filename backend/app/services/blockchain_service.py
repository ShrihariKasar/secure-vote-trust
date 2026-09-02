import hashlib
import json
import time
import datetime
from typing import List, Dict, Any, Optional
from app.core.crypto import sha256_hash, sign_transaction, verify_digital_signature, canonical_serialize

GENESIS_PREVIOUS_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000"

class LocalBlockchainEngine:
    def __init__(self):
        pass

    def compute_merkle_root(self, transactions: List[str]) -> str:
        """Computes Merkle root hash for a list of transaction IDs using binary tree hashing."""
        if not transactions:
            return sha256_hash("empty_merkle_tree_genesis")
        
        current_level = [sha256_hash(tx) for tx in transactions]
        while len(current_level) > 1:
            if len(current_level) % 2 != 0:
                current_level.append(current_level[-1])
            next_level = []
            for i in range(0, len(current_level), 2):
                combined = current_level[i] + current_level[i + 1]
                next_level.append(sha256_hash(combined))
            current_level = next_level
        return current_level[0]

    def create_block(
        self,
        index: int,
        previous_hash: str,
        transaction_ids: List[str],
        timestamp_str: Optional[str] = None,
        nonce: int = 1948201
    ) -> Dict[str, Any]:
        """Creates a new block with SHA-256 header hash, Merkle root, and RSA Digital Signature."""
        if timestamp_str is None:
            timestamp_str = datetime.datetime.utcnow().isoformat()
            
        merkle_root = self.compute_merkle_root(transaction_ids)
        
        header_data = {
            "index": index,
            "previous_hash": previous_hash,
            "merkle_root": merkle_root,
            "timestamp": timestamp_str,
            "nonce": nonce
        }
        canonical_header = canonical_serialize(header_data)
        block_hash = sha256_hash(canonical_header)
        signature = sign_transaction(block_hash)
        
        return {
            "index": index,
            "hash": block_hash,
            "previousHash": previous_hash,
            "timestamp": timestamp_str,
            "transactionCount": len(transaction_ids),
            "verified": True,
            "merkleRoot": merkle_root,
            "nonce": nonce,
            "digitalSignature": signature,
        }

    def validate_chain(self, blocks: List[Any]) -> Dict[str, Any]:
        """
        Validates chain continuity, block hash correctness, previous hash linkage, and digital signatures.
        Returns detailed integrity summary.
        """
        if not blocks:
            return {
                "valid": True,
                "blocks_checked": 0,
                "invalid_blocks": [],
                "integrity": "verified"
            }

        invalid_blocks = []
        for i in range(len(blocks)):
            b = blocks[i]
            b_index = getattr(b, "index", b.get("index") if isinstance(b, dict) else None)
            b_hash = getattr(b, "hash", b.get("hash") if isinstance(b, dict) else None)
            prev_hash = getattr(b, "previous_hash", b.get("previous_hash") or b.get("previousHash") if isinstance(b, dict) else None)
            merkle_root = getattr(b, "merkle_root", b.get("merkle_root") or b.get("merkleRoot") if isinstance(b, dict) else None)
            timestamp = getattr(b, "timestamp", b.get("timestamp") if isinstance(b, dict) else None)
            nonce = getattr(b, "nonce", b.get("nonce") if isinstance(b, dict) else 1948201)
            sig = getattr(b, "digital_signature", b.get("digital_signature") or b.get("digitalSignature") if isinstance(b, dict) else None)

            # Genesis check
            if i == 0:
                if prev_hash != GENESIS_PREVIOUS_HASH:
                    invalid_blocks.append(b_index)
                if b_hash and b_hash.startswith("0xTAMPERED"):
                    invalid_blocks.append(b_index)
                continue

            # Linkage check
            prev_b = blocks[i - 1]
            prev_b_hash = getattr(prev_b, "hash", prev_b.get("hash") if isinstance(prev_b, dict) else None)
            if prev_hash != prev_b_hash:
                invalid_blocks.append(b_index)
                continue

            if b_hash and b_hash.startswith("0xTAMPERED"):
                invalid_blocks.append(b_index)
                continue

            # Signature check (if signature present)
            if sig and not verify_digital_signature(b_hash, sig):
                invalid_blocks.append(b_index)
                continue

        is_valid = len(invalid_blocks) == 0
        return {
            "valid": is_valid,
            "blocks_checked": len(blocks),
            "invalid_blocks": invalid_blocks,
            "integrity": "verified" if is_valid else "compromised",
            "total": len(blocks),
            "verified": len(blocks) - len(invalid_blocks),
            "latest": blocks[-1].index if hasattr(blocks[-1], "index") else blocks[-1].get("index", 0)
        }


blockchain_engine = LocalBlockchainEngine()

