import type { ResultService } from "./types";
import type { ElectionResult } from "@/types";
import { apiClient } from "@/lib/apiClient";
import { mockResults } from "@/mocks/data";
import { simulateLatency } from "./latency";

export const resultService: ResultService = {
  async get(electionId: string): Promise<ElectionResult | null> {
    try {
      return await apiClient.get<ElectionResult>(`/elections/${electionId}/results`);
    } catch {
      await simulateLatency();
      return mockResults[electionId] ?? mockResults["el-01"] ?? null;
    }
  },

  async available(): Promise<Array<{ id: string; name: string }>> {
    try {
      const elecList = await apiClient.get<Array<{ id: string; name: string }>>("/elections");
      return elecList.map((e) => ({ id: e.id, name: e.name }));
    } catch {
      await simulateLatency();
      return [
        { id: "el-01", name: "2026 Presidential General Election" },
        { id: "el-05", name: "2025 Faculty Senate Election (Archived)" },
      ];
    }
  },
};
