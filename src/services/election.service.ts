import type { ElectionService, ElectionListFilters, ElectionDraft } from "./types";
import type { AdminOverview, Election } from "@/types";
import { apiClient } from "@/lib/apiClient";

export const electionService: ElectionService = {
  async list(filters?: ElectionListFilters): Promise<Election[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.status) params.append("status", filters.status);
    const queryString = params.toString();
    return await apiClient.get<Election[]>(`/elections${queryString ? `?${queryString}` : ""}`);
  },

  async get(id: string): Promise<Election | undefined> {
    try {
      return await apiClient.get<Election>(`/elections/${id}`);
    } catch {
      return undefined;
    }
  },

  async active(): Promise<Election | undefined> {
    try {
      return await apiClient.get<Election>("/voter/elections/active");
    } catch {
      return undefined;
    }
  },

  async create(draft: ElectionDraft): Promise<Election> {
    return await apiClient.post<Election>("/elections", draft);
  },

  async overview(): Promise<AdminOverview> {
    return await apiClient.get<AdminOverview>("/admin/overview");
  },

  async turnoutSeries(id: string): Promise<Array<{ label: string; votes: number }>> {
    try {
      return await apiClient.get<Array<{ label: string; votes: number }>>(`/elections/${id}/turnout-series`);
    } catch {
      return [];
    }
  },
};
