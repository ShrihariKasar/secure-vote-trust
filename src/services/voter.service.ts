import type { VoterService } from "./types";
import type { Voter } from "@/types";
import { apiClient } from "@/lib/apiClient";

export const voterService: VoterService = {
  async list(): Promise<Voter[]> {
    return await apiClient.get<Voter[]>("/admin/voters");
  },

  async get(id: string): Promise<Voter | undefined> {
    try {
      return await apiClient.get<Voter>(`/voters/${id}`);
    } catch {
      return undefined;
    }
  },

  async setApproval(id: string, approval: Voter["approval"]): Promise<Voter> {
    return await apiClient.patch<Voter>(`/admin/voters/${id}/approve`, { approval });
  },
};
