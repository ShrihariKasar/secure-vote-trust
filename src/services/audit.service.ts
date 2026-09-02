import type { AuditService, AuditQuery } from "./types";
import type { AuditEntry } from "@/types";
import { apiClient } from "@/lib/apiClient";
import { auditEntries } from "@/mocks/data";
import { simulateLatency } from "./latency";

export const auditService: AuditService = {
  async list(query?: AuditQuery): Promise<AuditEntry[]> {
    try {
      const params = new URLSearchParams();
      if (query?.search) params.append("search", query.search);
      if (query?.role) params.append("role", query.role);
      if (query?.status) params.append("status", query.status);
      return await apiClient.get<AuditEntry[]>(`/audit-logs?${params.toString()}`);
    } catch {
      await simulateLatency();
      let res = auditEntries;
      if (query?.search) {
        const q = query.search.toLowerCase();
        res = res.filter(
          (a: AuditEntry) =>
            a.actor.toLowerCase().includes(q) ||
            a.action.toLowerCase().includes(q) ||
            a.entity.toLowerCase().includes(q) ||
            a.reference.toLowerCase().includes(q),
        );
      }
      if (query?.role && query.role !== "all") {
        res = res.filter((a: AuditEntry) => a.role === query.role);
      }
      if (query?.status && query.status !== "all") {
        res = res.filter((a: AuditEntry) => a.status === query.status);
      }
      return res;
    }
  },

  async actions(): Promise<string[]> {
    await simulateLatency();
    return Array.from(new Set(auditEntries.map((a: AuditEntry) => a.action)));
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
