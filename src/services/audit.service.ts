import type { AuditService, AuditQuery } from "./types";
import type { AuditEntry } from "@/types";
import { apiClient } from "@/lib/apiClient";

export const auditService: AuditService = {
  async list(query?: AuditQuery): Promise<AuditEntry[]> {
    const params = new URLSearchParams();
    if (query?.search) params.append("search", query.search);
    if (query?.role) params.append("role", query.role);
    if (query?.status) params.append("status", query.status);
    const queryString = params.toString();
    return await apiClient.get<AuditEntry[]>(`/audit-logs${queryString ? `?${queryString}` : ""}`);
  },

  async actions(): Promise<string[]> {
    try {
      return await apiClient.get<string[]>("/audit-logs/actions");
    } catch {
      return [];
    }
  },

  exportCsv(entries: AuditEntry[]): string {
    const headers = ["ID", "Timestamp", "Actor", "Role", "Action", "Entity", "Status", "Source", "Reference"];
    const rows = entries.map((e) => [
      e.id,
      e.timestamp,
      `"${e.actor}"`,
      e.role,
      `"${e.action}"`,
      `"${e.entity}"`,
      e.status,
      e.source,
      `"${e.reference}"`,
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  },
};
