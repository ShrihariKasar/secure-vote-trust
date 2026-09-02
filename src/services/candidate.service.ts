import type { CandidateService } from "./types";
import type { Candidate } from "@/types";
import { apiClient } from "@/lib/apiClient";
import { candidates } from "@/mocks/data";
import { simulateLatency } from "./latency";

let inMemoryCandidates = [...candidates];

export const candidateService: CandidateService = {
  async listByElection(electionId: string): Promise<Candidate[]> {
    try {
      return await apiClient.get<Candidate[]>(`/elections/${electionId}/candidates`);
    } catch {
      await simulateLatency();
      return inMemoryCandidates.filter((c: Candidate) => c.electionId === electionId);
    }
  },

  async create(input: Omit<Candidate, "initials" | "status">): Promise<Candidate> {
    try {
      return await apiClient.post<Candidate>(`/elections/${input.electionId}/candidates`, input);
    } catch {
      await simulateLatency();
      const initials = input.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      const candidate: Candidate = {
        ...input,
        initials,
        status: "active",
      };
      inMemoryCandidates.push(candidate);
      return candidate;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await apiClient.delete(`/candidates/${id}`);
    } catch {
      await simulateLatency();
      inMemoryCandidates = inMemoryCandidates.filter((c) => c.id !== id);
    }
  },
};
