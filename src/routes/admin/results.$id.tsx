import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck, Trophy, CheckCircle2, BarChart3, Users } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader, MetricCard } from "@/components/app/surfaces";
import { ElectionStatusBadge } from "@/components/app/status-badge";
import { LoadingState, ErrorState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { resultService } from "@/services";
import type { ElectionResult } from "@/types";

export const Route = createFileRoute("/admin/results/$id")({
  head: () => ({
    meta: [
      { title: "Election Results & Analytics — SecureVote Trust" },
      { name: "description", content: "Detailed ballot tallies and winner verification." },
    ],
  }),
  component: ElectionResultsDetailPage,
});

function ElectionResultsDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState<ElectionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResult() {
      try {
        const res = await resultService.get(id);
        if (res) setResult(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadResult();
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <LoadingState label="Tallying encrypted ballot results" />
      </AppLayout>
    );
  }

  if (!result) {
    return (
      <AppLayout>
        <ErrorState title="Results Unavailable" description="No results published for this election yet." />
      </AppLayout>
    );
  }

  const winner = result.results[0];

  return (
    <AppLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/results" })} className="gap-1.5 text-xs">
          <ArrowLeft className="size-3.5" />
          <span>Back to All Results</span>
        </Button>

        <PageHeader
          title={result.electionName}
          description="Official tally verified against distributed ledger nodes."
          actions={<ElectionStatusBadge status={result.status} />}
        />

        {/* Metrics Bar */}
        <div className="grid gap-4 sm:grid-cols-4">
          <MetricCard label="Total Votes Cast" value={result.votesCast} hint="Verified block receipts" />
          <MetricCard label="Voter Turnout" value={`${result.turnout}%`} hint={`${result.registered} registered voters`} tone="success" />
          <MetricCard label="Ledger Integrity" value={result.chainVerified ? "100% Verified" : "Compromised"} tone={result.chainVerified ? "success" : "warning"} />
          <MetricCard label="Winner Rank #1" value={winner?.name || "N/A"} hint={`${winner?.percentage}% of vote`} tone="default" />
        </div>

        {/* Winner Highlight Card */}
        {winner && (
          <Panel className="p-6 bg-gradient-to-r from-surface via-primary-soft/30 to-surface border-2 border-primary/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-raised">
                  <Trophy className="size-7 text-amber-300" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Projected Election Winner</span>
                  <h2 className="text-xl font-extrabold text-foreground leading-tight">{winner.name}</h2>
                  <p className="text-xs text-muted-foreground">{winner.position}</p>
                </div>
              </div>

              <div className="text-right sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
                <p className="text-3xl font-extrabold numeric text-primary">{winner.votes} Votes</p>
                <p className="text-xs font-semibold text-muted-foreground">{winner.percentage}% Majority Share</p>
              </div>
            </div>
          </Panel>
        )}

        {/* Full Candidate Tally Breakdown */}
        <Panel>
          <PanelHeader
            title="Official Tally Breakdown"
            description="End-to-end cryptographic vote distribution."
          />

          <div className="p-6 space-y-6">
            {result.results.map((cand) => (
              <div key={cand.candidateId} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-bold text-foreground">
                      #{cand.rank}
                    </span>
                    <span className="font-semibold text-foreground">{cand.name}</span>
                    <span className="text-muted-foreground">({cand.position})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-foreground">{cand.votes} votes</span>
                    <span className="font-mono text-muted-foreground w-12 text-right">{cand.percentage}%</span>
                  </div>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full transition-all duration-500 ${cand.rank === 1 ? "bg-primary" : "bg-integrity"}`}
                    style={{ width: `${cand.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppLayout>
  );
}
