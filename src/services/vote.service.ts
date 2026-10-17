import type { VotingService } from "./types";
import type { VoteTransaction } from "@/types";
import { apiClient } from "@/lib/apiClient";

export const voteService: VotingService = {
  async castVote(input: {
    electionId: string;
    candidateId: string;
    voterId: string;
  }): Promise<VoteTransaction> {
    const votingSessionToken = localStorage.getItem("securevote.voting_session_token") || undefined;
    return await apiClient.post<VoteTransaction>("/votes", {
      ...input,
      votingSessionToken,
    });
  },

  async myVote(voterId?: string, electionId?: string): Promise<VoteTransaction | null> {
    try {
      const params = new URLSearchParams();
      if (voterId) params.append("voter_id", voterId);
      if (electionId) params.append("election_id", electionId);
      const query = params.toString() ? `?${params.toString()}` : "";
      return await apiClient.get<VoteTransaction | null>(`/voter/my-vote${query}`);
    } catch {
      return null;
    }
  },

  async hasVoted(voterId?: string, electionId?: string): Promise<boolean> {
    try {
      const vote = await this.myVote(voterId, electionId);
      return vote !== null;
    } catch {
      return false;
    }
  },

  async verifyReceipt(receiptOrTxId: string): Promise<any> {
    return await apiClient.get<any>(`/votes/verify-receipt/${encodeURIComponent(receiptOrTxId)}`);
  },
};
