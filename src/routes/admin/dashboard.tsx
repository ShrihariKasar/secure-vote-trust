import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Vote,
  Users,
  UserCheck,
  ShieldAlert,
  Blocks,
  BarChart3,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader, MetricCard } from "@/components/app/surfaces";
import { StatusBadge, ElectionStatusBadge } from "@/components/app/status-badge";
import { LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { electionService, voterService, auditService, blockchainService } from "@/services";
import type { AdminOverview, AuditEntry, Election } from "@/types";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Overview — SecureVote Trust" },
      { name: "description", content: "Electoral management & zero-trust network overview." },
    ],
  }),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [elections, setElections] = useState<Election[]>([]);
  const [recentAudit, setRecentAudit] = useState<AuditEntry[]>([]);
  const [blockchainStats, setBlockchainStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ov, elecList, auditList, bcStats] = await Promise.all([
          electionService.overview(),
          electionService.list(),
          auditService.list(),
          blockchainService.stats().catch(() => null),
        ]);
        setOverview(ov);
        setElections(elecList);
        setRecentAudit(auditList.slice(0, 5));
        if (bcStats) setBlockchainStats(bcStats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <LoadingState label="Loading administrator console" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Electoral Administrator Console"
        description="Monitor system integrity, manage elections, audit voter registration applications, and inspect blockchain blocks."
        actions={
          <Button onClick={() => navigate({ to: "/admin/elections/new" })} className="gap-2 shadow-raised">
            <PlusCircle className="size-4" />
            <span>Create New Election</span>
          </Button>
        }
      />

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Active Elections"
          value={overview?.activeElections ?? 0}
          hint="Open for voting"
          tone="success"
        />
        <MetricCard
          label="Pending Voter Queue"
          value={overview?.pendingVoters ?? 0}
          hint="Requires admin review"
          tone={overview?.pendingVoters ? "warning" : "default"}
        />
        <MetricCard
          label="Total Votes Cast"
          value={overview?.votesCast ?? 0}
          hint="Signed & block sealed"
          tone="default"
        />
        <MetricCard
          label="Voter Turnout"
          value={`${overview?.turnout ?? 0}%`}
          hint={`${overview?.approvedVoters ?? 0} approved voters`}
          tone="default"
        />
      </div>

      {/* System Status Overview Section */}
      <Panel className="p-4">
        <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-integrity" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System Health Status</h4>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">Zero-Trust Real-time Oversight</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-surface-raised p-2.5 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">FastAPI Engine</span>
            <StatusBadge tone="success">Operational</StatusBadge>
          </div>
          <div className="rounded-lg border border-border bg-surface-raised p-2.5 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">SQLite Storage</span>
            <StatusBadge tone="success">Operational</StatusBadge>
          </div>
          <div className="rounded-lg border border-border bg-surface-raised p-2.5 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Local Blockchain</span>
            <StatusBadge tone="success">Operational</StatusBadge>
          </div>
          <div className="rounded-lg border border-border bg-surface-raised p-2.5 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Biometric Sensor</span>
            <StatusBadge tone="success">Operational</StatusBadge>
          </div>
        </div>
      </Panel>


      {/* Quick Action Navigation Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="p-4 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate({ to: "/admin/voters" })}>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-warning-soft text-warning">
              <UserCheck className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Voter Approval Queue</h4>
              <p className="text-xs text-muted-foreground">{overview?.pendingVoters ?? 0} applications pending</p>
            </div>
          </div>
        </Panel>

        <Panel className="p-4 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate({ to: "/admin/elections" })}>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Vote className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Manage Elections</h4>
              <p className="text-xs text-muted-foreground">{elections.length} total elections</p>
            </div>
          </div>
        </Panel>

        <Panel className="p-4 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate({ to: "/admin/blockchain" })}>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-integrity-soft text-integrity">
              <Blocks className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Blockchain Explorer</h4>
              <p className="text-xs text-muted-foreground">Ledger height #{blockchainStats?.totalBlocks ?? 1} verified</p>
            </div>
          </div>
        </Panel>

        <Panel className="p-4 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate({ to: "/admin/audit" })}>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Audit Log Trail</h4>
              <p className="text-xs text-muted-foreground">Exportable CSV trail</p>
            </div>
          </div>
        </Panel>
      </div>

      {/* Elections Overview Section */}
      <Panel>
        <PanelHeader
          title="Active Elections Status"
          description="Live participation metrics across all elections."
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/admin/elections" })} className="gap-1.5 text-xs">
              <span>View All</span>
              <ArrowRight className="size-3.5" />
            </Button>
          }
        />

        <div className="divide-y divide-border">
          {elections.slice(0, 3).map((elec) => (
            <div key={elec.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <ElectionStatusBadge status={elec.status} />
                  <span className="text-xs font-mono text-muted-foreground">ID: {elec.id}</span>
                </div>
                <h4 className="font-semibold text-sm text-foreground">{elec.name}</h4>
              </div>

              <div className="flex items-center gap-6 shrink-0 text-xs">
                <div className="text-right">
                  <p className="font-semibold numeric text-foreground">{elec.votesCast} / {elec.registeredVoters}</p>
                  <p className="text-muted-foreground">Votes Cast</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate({ to: `/admin/results/${elec.id}` as any })} className="text-xs gap-1">
                  <BarChart3 className="size-3.5" />
                  <span>Results</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Recent Audit Feed */}
      <Panel>
        <PanelHeader
          title="Recent System Events"
          description="Real-time audit log stream."
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/admin/audit" })} className="gap-1.5 text-xs">
              <span>Audit Trail</span>
              <ArrowRight className="size-3.5" />
            </Button>
          }
        />

        <div className="divide-y divide-border text-xs">
          {recentAudit.map((log) => (
            <div key={log.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <StatusBadge tone={log.status === "success" ? "success" : log.status === "warning" ? "warning" : "danger"}>
                  {log.status}
                </StatusBadge>
                <div>
                  <span className="font-semibold text-foreground">{log.action}</span>
                  <span className="text-muted-foreground"> by {log.actor} ({log.role})</span>
                </div>
              </div>
              <span className="font-mono text-muted-foreground text-[11px]">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </AppLayout>
  );
}
