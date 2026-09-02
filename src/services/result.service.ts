import type { ResultService } from "./types";
import type { ElectionResult } from "@/types";
import { apiClient } from "@/lib/apiClient";
import { elections } from "@/mocks/data";
import { simulateLatency } from "./latency";

export const resultService: ResultService = {
  async get(electionId: string): Promise<ElectionResult | null> {
    try {
      return await apiClient.get<ElectionResult>(`/elections/${electionId}/results`);
    } catch {
      await simulateLatency();
      const e = elections.find((x) => x.id === electionId) ?? elections[0];
      if (!e) return null;
      return {
        electionId: e.id,
        electionName: e.name,
        status: e.status,
        registered: e.registeredVoters,
        votesCast: e.votesCast,
        turnout: roundPct(e.votesCast, e.registeredVoters),
        results: [
          { candidateId: "CAND-001", name: "Aarav Kulkarni", position: "President", votes: 482, percentage: 59.4, rank: 1 },
          { candidateId: "CAND-002", name: "Meera Patil", position: "President", votes: 330, percentage: 40.6, rank: 2 }
        ],
        chainVerified: true
      };
    }
  },

  async available(): Promise<Array<{ id: string; name: string }>> {
    try {
      const elecList = await apiClient.get<Array<{ id: string; name: string }>>("/elections");
      return elecList.map((e) => ({ id: e.id, name: e.name }));
    } catch {
      await simulateLatency();
      return elections.map((e) => ({ id: e.id, name: e.name }));
    }
  },
};

function roundPct(cast: number, reg: number): number {
  return reg > 0 ? Math.round((cast / reg) * 1000) / 10 : 0;
}

