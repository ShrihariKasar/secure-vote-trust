import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Eye,
  Link as LinkIcon,
  Fingerprint,
  Calendar,
  User,
  Activity,
  Layers
} from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader } from "@/components/app/surfaces";
import { StatusBadge } from "@/components/app/status-badge";
import { LoadingState, EmptyState } from "@/components/app/states";
import { HashDisplay } from "@/components/app/hash-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { auditService } from "@/services";
import type { AuditEntry, AuditChainVerification } from "@/types";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "Institutional Audit Trail — SecureVote Trust" },
      { name: "description", content: "Cryptographic event audit trail with SHA-256 hash chaining." },
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

  // Chain verification state
  const [chainStatus, setChainStatus] = useState<AuditChainVerification | null>(null);
  const [verifyingChain, setVerifyingChain] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditEntry | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const queryObj: any = { search };
      if (roleFilter !== "all") queryObj.role = roleFilter;
      if (statusFilter !== "all") queryObj.status = statusFilter;
      const list = await auditService.list(queryObj);
      setLogs(list);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const verifyChainIntegrity = async () => {
    try {
      setVerifyingChain(true);
      const result = await auditService.verifyChain();
      setChainStatus(result);
    } catch (err) {
      console.error("Failed to verify audit chain:", err);
    } finally {
      setVerifyingChain(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    verifyChainIntegrity();
  }, []);

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
        description="Immutable, tamper-evident cryptographic event log. Every event is linked via SHA-256 hash chains to detect unauthorized modification."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={verifyChainIntegrity}
              variant="outline"
              disabled={verifyingChain}
              className="gap-2 text-xs border-primary/40 hover:bg-primary/10"
            >
              <RefreshCw className={`size-3.5 ${verifyingChain ? "animate-spin text-primary" : "text-muted-foreground"}`} />
              <span>{verifyingChain ? "Verifying Chain..." : "Verify Chain Now"}</span>
            </Button>
            <Button onClick={handleExportCsv} variant="outline" className="gap-2 text-xs">
              <Download className="size-4" />
              <span>Export Audit Log (CSV)</span>
            </Button>
          </div>
        }
      />

      {/* Cryptographic Chain Integrity Banner */}
      <div className={`p-5 rounded-xl border backdrop-blur-sm transition-all mb-6 ${
        chainStatus?.integrity === "verified"
          ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-100"
          : chainStatus?.integrity === "compromised"
          ? "bg-rose-950/25 border-rose-500/40 text-rose-100"
          : "bg-muted/30 border-border text-foreground"
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-lg shrink-0 ${
              chainStatus?.integrity === "verified"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : chainStatus?.integrity === "compromised"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-muted text-muted-foreground"
            }`}>
              {chainStatus?.integrity === "verified" ? (
                <ShieldCheck className="size-6" />
              ) : chainStatus?.integrity === "compromised" ? (
                <AlertTriangle className="size-6" />
              ) : (
                <Activity className="size-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base tracking-tight text-foreground">
                  Audit Chain Integrity:{" "}
                  <span className={chainStatus?.integrity === "verified" ? "text-emerald-400" : "text-rose-400"}>
                    {chainStatus?.integrity ? chainStatus.integrity.toUpperCase() : "CHECKING..."}
                  </span>
                </h3>
                {chainStatus?.integrity === "verified" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="size-3" />
                    Cryptographically Sound
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                {chainStatus?.message || "Validating cryptographic hash chain across historical audit records..."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t lg:border-t-0 lg:border-l border-border/60 pt-3 lg:pt-0 lg:pl-6 text-xs shrink-0">
            <div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono uppercase">
                <Layers className="size-3 text-muted-foreground" />
                Verified Logs
              </div>
              <div className="font-semibold font-mono text-sm text-foreground mt-0.5">
                {chainStatus ? `${chainStatus.totalLogs} Records` : "..."}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono uppercase">
                <Fingerprint className="size-3 text-muted-foreground" />
                Chain Head Hash
              </div>
              <div className="mt-0.5">
                {chainStatus?.chainHeadHash ? (
                  <HashDisplay value={chainStatus.chainHeadHash} label="Chain Head" truncate={true} />
                ) : (
                  <span className="text-muted-foreground font-mono text-xs">...</span>
                )}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono uppercase">
                <Calendar className="size-3 text-muted-foreground" />
                Last Verified
              </div>
              <div className="font-mono text-xs text-muted-foreground mt-0.5">
                {chainStatus?.timestamp ? new Date(chainStatus.timestamp).toLocaleTimeString() : "..."}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Panel>
        <PanelHeader
          title="System Audit Events"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search logs, actions, actors..."
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
          <LoadingState label="Loading audit logs..." />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No Log Entries Found"
            description="No audit events matched your search criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actor & Role</th>
                  <th className="px-4 py-3">Action Event</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">SHA-256 Hash</th>
                  <th className="px-4 py-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
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
                      <span className="text-muted-foreground text-[11px]"> ({log.role})</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      <code className="text-[11px] bg-muted/60 px-1.5 py-0.5 rounded border border-border/40 font-mono">
                        {log.action}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[140px] truncate">{log.entity}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono" onClick={(e) => e.stopPropagation()}>
                      {log.currentHash ? (
                        <HashDisplay value={log.currentHash} label="Current Log Hash" truncate={true} />
                      ) : (
                        <span className="text-muted-foreground/60 text-[11px] italic">Genesis / Unchained</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-7 p-0 text-muted-foreground group-hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        title="Inspect Cryptographic Log Record"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Cryptographic Event Inspection Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <Fingerprint className="size-5 text-primary" />
                Cryptographic Audit Log Record
              </DialogTitle>
              {selectedLog && (
                <StatusBadge tone={selectedLog.status === "success" ? "success" : selectedLog.status === "warning" ? "warning" : "danger"}>
                  {selectedLog.status}
                </StatusBadge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Deterministic cryptographic block verification of event ID: <code className="font-mono text-foreground">{selectedLog?.id}</code>
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-2 text-xs">
              {/* Event Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                <div>
                  <span className="text-muted-foreground font-mono uppercase text-[10px] block">Actor</span>
                  <span className="font-medium text-foreground">{selectedLog.actor}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-mono uppercase text-[10px] block">Role</span>
                  <span className="font-medium text-foreground capitalize">{selectedLog.role}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-mono uppercase text-[10px] block">Entity</span>
                  <span className="font-medium text-foreground">{selectedLog.entity}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-mono uppercase text-[10px] block">Action Event</span>
                  <span className="font-mono text-primary font-medium">{selectedLog.action}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground font-mono uppercase text-[10px] block">Timestamp</span>
                  <span className="font-mono text-muted-foreground">{new Date(selectedLog.timestamp).toLocaleString()} ({selectedLog.timestamp})</span>
                </div>
              </div>

              {/* Reference / Data Payload */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <span className="text-muted-foreground font-mono uppercase text-[10px] block mb-1">Payload Reference</span>
                <p className="font-mono text-foreground text-xs break-all bg-background/50 p-2 rounded border border-border/40">
                  {selectedLog.reference || "None specified"}
                </p>
              </div>

              {/* SHA-256 Hash Chain Visualization */}
              <div className="p-4 rounded-lg bg-background border border-border/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <LinkIcon className="size-3.5 text-primary" />
                  <span>SHA-256 Cryptographic Link</span>
                </div>

                <div className="space-y-2 font-mono text-[11px]">
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block mb-0.5">Previous Block Hash (Parent Link)</span>
                    <div className="bg-muted/50 p-2 rounded border border-border/60 break-all text-muted-foreground">
                      {selectedLog.previousHash ? (
                        <HashDisplay value={selectedLog.previousHash} label="Previous Hash" truncate={false} />
                      ) : (
                        <span className="italic">0x0000000000000000000000000000000000000000000000000000000000000000 (Genesis Anchor)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center text-muted-foreground/60 py-0.5">
                    <span className="text-xs tracking-widest font-mono">↓ SHA-256(Parent + Payload)</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block mb-0.5">Current Record Hash</span>
                    <div className="bg-primary/5 border border-primary/20 p-2 rounded break-all text-primary">
                      {selectedLog.currentHash ? (
                        <HashDisplay value={selectedLog.currentHash} label="Current Hash" truncate={false} />
                      ) : (
                        <span className="italic">Not computed</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground bg-muted/20 p-2 rounded border border-border/30">
                  💡 This cryptographic hash links directly into the next audit record. If any past record, actor, or payload is altered, every subsequent hash in the chain becomes invalid.
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
