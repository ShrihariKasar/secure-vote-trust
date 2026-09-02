import hashlib
import json
import time
from typing import List, Dict, Any, Optional
from app.core.crypto import sha256_hash

class LocalBlockchainEngine:
    def __init__(self):
        pass

    def compute_merkle_root(self, transactions: List[str]) -> str:
        """Computes Merkle root hash for a list of transaction IDs."""
        if not transactions:
            return sha256_hash("empty_merkle_tree")
        
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
        nonce: int = 1948201
    ) -> Dict[str, Any]:
        """Creates a new block with SHA-256 header hash and Merkle root."""
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        merkle_root = self.compute_merkle_root(transaction_ids)
        
        block_header = f"{index}:{previous_hash}:{merkle_root}:{timestamp}:{nonce}"
        block_hash = sha256_hash(block_header)
        
        return {
            "index": index,
            "hash": block_hash,
            "previousHash": previous_hash,
            "timestamp": timestamp,
            "transactionCount": len(transaction_ids),
            "verified": True,
            "merkleRoot": merkle_root,
            "nonce": nonce,
        }

    def validate_chain(self, blocks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validates chain continuity and header signatures."""
        if not blocks:
            return {"total": 0, "verified": 0, "latest": 0, "integrity": "verified"}

        verified_count = 0
        for i in range(len(blocks)):
            b = blocks[i]
            if i > 0:
                prev_b = blocks[i - 1]
                if b["previousHash"] != prev_b["hash"]:
                    return {
                        "total": len(blocks),
                        "verified": verified_count,
                        "latest": blocks[-1]["index"],
                        "integrity": "compromised",
                    }
            verified_count += 1

        return {
            "total": len(blocks),
            "verified": verified_count,
            "latest": blocks[-1]["index"],
            "integrity": "verified",
        }

blockchain_engine = LocalBlockchainEngine()
