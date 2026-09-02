import { auditEntries } from "@/mocks/data";
import type { AuditEntry } from "@/types";
import { clone, delay } from "./latency";
import type { AuditService } from "./types";

export const auditService: AuditService = {
  async list(query) {
    let rows = clone(auditEntries).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    if (query?.search) {
      const q = query.search.toLowerCase();
      rows = rows.filter((r) =>
        [r.actor, r.action, r.entity, r.reference].some((f) => f.toLowerCase().includes(q)),
      );
    }
    if (query?.role && query.role !== "all") rows = rows.filter((r) => r.role === query.role);
    if (query?.status && query.status !== "all") rows = rows.filter((r) => r.status === query.status);
    if (query?.action && query.action !== "all") rows = rows.filter((r) => r.action === query.action);
    return delay(rows);
  },

  async actions() {
    return delay([...new Set(auditEntries.map((e) => e.action))].sort());
  },

  exportCsv(entries: AuditEntry[]) {
    const header = "timestamp,actor,role,action,entity,status,source,reference";
    const body = entries
      .map((e) => [e.timestamp, e.actor, e.role, e.action, e.entity, e.status, e.source, e.reference].join(","))
      .join("\n");
    return `${header}\n${body}`;
  },
};
