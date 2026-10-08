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

  async myVote(voterId: string): Promise<VoteTransaction | null> {
    try {
      return await apiClient.get<VoteTransaction | null>(`/voter/my-vote?voter_id=${voterId}`);
    } catch {
      return null;
    }
  },

  async hasVoted(voterId: string): Promise<boolean> {
    try {
      const vote = await this.myVote(voterId);
      return vote !== null;
    } catch {
      return false;
    }
  },
};
