import { blocks, sampleTransaction } from "@/mocks/data";
import type { VoteTransaction } from "@/types";
import { clone, delay } from "./latency";
import type { VotingService } from "./types";

const ledger = new Map<string, VoteTransaction>();
ledger.set("VTR-1042", clone(sampleTransaction));

const nextHash = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    h = (h * 1103515245 + 12345) >>> 0;
    out += h.toString(16).padStart(8, "0");
  }
  return out.slice(0, 64);
};

export const voteService: VotingService = {
  async castVote({ electionId, candidateId, voterId }) {
    const last = blocks[blocks.length - 1];
    const transaction: VoteTransaction = {
      transactionId: `TX-${nextHash(voterId + candidateId).slice(0, 5).toUpperCase()}`,
      electionId,
      blockIndex: last.index + 1,
      blockHash: nextHash(voterId + candidateId + electionId),
      previousHash: last.hash,
      timestamp: new Date().toISOString(),
      signatureValid: true,
      verified: true,
    };
    ledger.set(voterId, transaction);
    return delay(clone(transaction), 500);
  },

  async myVote(voterId) {
    return delay(clone(ledger.get(voterId) ?? null));
  },

  async hasVoted(voterId) {
    return delay(ledger.has(voterId));
  },
};
