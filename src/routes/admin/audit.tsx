import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, Search, Download, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader } from "@/components/app/surfaces";
import { StatusBadge } from "@/components/app/status-badge";
import { LoadingState, EmptyState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditService } from "@/services";
import type { AuditEntry } from "@/types";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "Institutional Audit Trail — SecureVote Trust" },
      { name: "description", content: "Cryptographic event audit trail." },
    ],
  }),
  component: AdminAuditPage,
});

function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const queryObj: any = { search };
        if (roleFilter !== "all") queryObj.role = roleFilter;
        if (statusFilter !== "all") queryObj.status = statusFilter;
        const list = await auditService.list(queryObj);
        setLogs(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [search, roleFilter, statusFilter]);

  const handleExportCsv = () => {
    const csvContent = auditService.exportCsv(logs);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `securevote_audit_trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Institutional System Audit Trail"
        description="Immutable, tamper-evident event log. Monitors biometric verifications, ballot broadcasts, admin actions, and ledger commits."
        actions={
          <Button onClick={handleExportCsv} variant="outline" className="gap-2 text-xs">
            <Download className="size-4" />
            <span>Export Audit Log (CSV)</span>
          </Button>
        }
      />

      <Panel>
        <PanelHeader
          title="System Audit Events"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-32 text-xs h-8">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="voter">Voter</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 text-xs h-8">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="failure">Failure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />

        {loading ? (
          <LoadingState label="Loading audit logs" />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No Log Entries Found"
            description="No audit events matched your search criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actor & Role</th>
                  <th className="px-4 py-3">Action Event</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Reference / IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge tone={log.status === "success" ? "success" : log.status === "warning" ? "warning" : "danger"}>
                        {log.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-foreground">{log.actor}</span>
                      <span className="text-muted-foreground"> ({log.role})</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{log.action}</td>
                    <td className="px-4 py-3 text-muted-foreground">{log.entity}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground text-[11px] max-w-xs truncate">
                      {log.reference}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </AppLayout>
  );
}
