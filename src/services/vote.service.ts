import type { VotingService } from "./types";
import type { VoteTransaction } from "@/types";
import { apiClient } from "@/lib/apiClient";
import { sampleTransaction } from "@/mocks/data";
import { simulateLatency } from "./latency";

let myVoteCache: VoteTransaction | null = sampleTransaction;

export const voteService: VotingService = {
  async castVote(input: {
    electionId: string;
    candidateId: string;
    voterId: string;
  }): Promise<VoteTransaction> {
    try {
      const votingSessionToken = localStorage.getItem("securevote.voting_session_token") || undefined;
      const tx = await apiClient.post<VoteTransaction>("/votes", {
        ...input,
        votingSessionToken,
      });
      myVoteCache = tx;
      return tx;
    } catch (err: any) {
      if (err?.status === 409) {
        throw err; // Re-throw 409 Conflict double-voting error
      }
      await simulateLatency(800);
      const tx: VoteTransaction = {
        transactionId: `0x${Math.random().toString(16).substring(2, 18)}${Math.random().toString(16).substring(2, 18)}`,
        electionId: input.electionId,
        blockIndex: 7,
        blockHash: "0x7f9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
        previousHash: "0x6e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d",
        timestamp: new Date().toISOString(),
        signatureValid: true,
        verified: true,
      };
      myVoteCache = tx;
      return tx;
    }
  },

  async myVote(voterId: string): Promise<VoteTransaction | null> {
    try {
      return await apiClient.get<VoteTransaction | null>(`/voter/my-vote?voter_id=${voterId}`);
    } catch {
      await simulateLatency();
      return myVoteCache;
    }
  },

  async hasVoted(voterId: string): Promise<boolean> {
    try {
      const vote = await this.myVote(voterId);
      return vote !== null;
    } catch {
      return myVoteCache !== null;
    }
  },
};
