import type { ElectionService, ElectionListFilters, ElectionDraft } from "./types";
import type { AdminOverview, Election } from "@/types";
import { apiClient } from "@/lib/apiClient";
import { elections, turnoutSeries } from "@/mocks/data";
import { simulateLatency } from "./latency";

let inMemoryElections = [...elections];

export const electionService: ElectionService = {
  async list(filters?: ElectionListFilters): Promise<Election[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.search) params.append("search", filters.search);
      if (filters?.status) params.append("status", filters.status);
      return await apiClient.get<Election[]>(`/elections?${params.toString()}`);
    } catch {
      await simulateLatency();
      let res = inMemoryElections;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        res = res.filter((e) => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
      }
      if (filters?.status && filters.status !== "all") {
        res = res.filter((e) => e.status === filters.status);
      }
      return res;
    }
  },

  async get(id: string): Promise<Election | undefined> {
    try {
      return await apiClient.get<Election>(`/elections/${id}`);
    } catch {
      await simulateLatency();
      return inMemoryElections.find((e) => e.id === id);
    }
  },

  async active(): Promise<Election | undefined> {
    try {
      return await apiClient.get<Election>("/voter/elections/active");
    } catch {
      await simulateLatency();
      return inMemoryElections.find((e) => e.status === "voting_open") ?? inMemoryElections[0];
    }
  },

  async create(draft: ElectionDraft): Promise<Election> {
    try {
      return await apiClient.post<Election>("/elections", draft);
    } catch {
      await simulateLatency();
      const newElection: Election = {
        id: draft.id || `el-${Math.random().toString(36).substring(2, 6)}`,
        name: draft.name,
        description: draft.description,
        status: draft.status,
        startAt: `${draft.startDate}T${draft.startTime}:00Z`,
        endAt: `${draft.endDate}T${draft.endTime}:00Z`,
        candidateIds: [],
        registeredVoters: 2500,
        votesCast: 0,
      };
      inMemoryElections = [newElection, ...inMemoryElections];
      return newElection;
    }
  },

  async overview(): Promise<AdminOverview> {
    try {
      return await apiClient.get<AdminOverview>("/admin/overview");
    } catch {
      await simulateLatency();
      return {
        activeElections: inMemoryElections.filter((e) => e.status === "voting_open").length,
        registeredVoters: 2500,
        approvedVoters: 2200,
        pendingVoters: 300,
        votesCast: 1485,
        turnout: 59.4,
      };
    }
  },

  async turnoutSeries(id: string): Promise<Array<{ label: string; votes: number }>> {
    await simulateLatency();
    return turnoutSeries;
  },
};

