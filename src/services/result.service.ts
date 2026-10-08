import type { ResultService } from "./types";
import type { ElectionResult } from "@/types";
import { apiClient } from "@/lib/apiClient";

export const resultService: ResultService = {
  async get(electionId: string): Promise<ElectionResult | null> {
    try {
      return await apiClient.get<ElectionResult>(`/elections/${electionId}/results`);
    } catch {
      return null;
    }
  },

  async available(): Promise<Array<{ id: string; name: string }>> {
    try {
      const elecList = await apiClient.get<Array<{ id: string; name: string }>>("/elections");
      return elecList.map((e) => ({ id: e.id, name: e.name }));
    } catch {
      return [];
    }
  },
};
