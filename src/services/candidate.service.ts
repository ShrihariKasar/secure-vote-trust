import type { CandidateService } from "./types";
import type { Candidate } from "@/types";
import { apiClient } from "@/lib/apiClient";

export const candidateService: CandidateService = {
  async listByElection(electionId: string): Promise<Candidate[]> {
    return await apiClient.get<Candidate[]>(`/elections/${electionId}/candidates`);
  },

  async create(input: Omit<Candidate, "initials" | "status">): Promise<Candidate> {
    return await apiClient.post<Candidate>(`/elections/${input.electionId}/candidates`, input);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/candidates/${id}`);
  },
};
