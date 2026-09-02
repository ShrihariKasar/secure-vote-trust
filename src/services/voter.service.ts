import type { VoterService } from "./types";
import type { Voter } from "@/types";
import { apiClient } from "@/lib/apiClient";
import { voters } from "@/mocks/data";
import { simulateLatency } from "./latency";

let inMemoryVoters = [...voters];

export const voterService: VoterService = {
  async list(): Promise<Voter[]> {
    try {
      return await apiClient.get<Voter[]>("/admin/voters");
    } catch {
      await simulateLatency();
      return inMemoryVoters;
    }
  },

  async get(id: string): Promise<Voter | undefined> {
    try {
      return await apiClient.get<Voter>(`/voters/${id}`);
    } catch {
      await simulateLatency();
      return inMemoryVoters.find((v) => v.id === id);
    }
  },

  async setApproval(id: string, approval: Voter["approval"]): Promise<Voter> {
    try {
      return await apiClient.patch<Voter>(`/admin/voters/${id}/approve`, { approval });
    } catch {
      await simulateLatency();
      const voter = inMemoryVoters.find((v) => v.id === id);
      if (!voter) throw new Error("Voter not found");
      voter.approval = approval;
      return { ...voter };
    }
  },
};
