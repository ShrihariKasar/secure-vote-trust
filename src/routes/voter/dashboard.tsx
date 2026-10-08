import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Vote, CheckCircle2, ShieldCheck, ArrowRight, UserCheck, Lock } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader, MetricCard } from "@/components/app/surfaces";
import { ElectionStatusBadge, VotingStatusBadge } from "@/components/app/status-badge";
import { LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { electionService, voteService } from "@/services";
import type { Election, VoteTransaction } from "@/types";

export const Route = createFileRoute("/voter/dashboard")({
  head: () => ({
    meta: [
      { title: "Voter Dashboard — SecureVote Trust" },
      { name: "description", content: "Active elections and ballot voting dashboard." },
    ],
  }),
  component: VoterDashboardPage,
});

function VoterDashboardPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [elections, setElections] = useState<Election[]>([]);
  const [myVote, setMyVote] = useState<VoteTransaction | null>(null);
  const [loading, setLoading] = useState(true);

  const voterId = session.user?.id;

  useEffect(() => {
    if (!session.user) {
      navigate({ to: "/login" });
      return;
    }

    async function loadData() {
      if (!voterId) return;
      try {
        const [elecList, voteTx] = await Promise.all([
          electionService.list(),
          voteService.myVote(voterId),
        ]);
        setElections(elecList);
        setMyVote(voteTx);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [voterId, session.user, navigate]);

  if (loading) {
    return (
      <AppLayout>
        <LoadingState label="Loading voter dashboard" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title={`Welcome, ${session.user?.name || "Voter"}`}
        description="Zero-trust voter portal. Select an active election below to exercise your secure, encrypted ballot."
      />

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Active Elections"
          value={elections.filter((e) => e.status === "voting_open").length}
          hint="Eligible to vote right now"
          tone="success"
        />
        <MetricCard
          label="Voter Approval"
          value={session.user?.faceVerified ? "Approved" : "Pending"}
          hint={session.user?.faceVerified ? "Biometric Face Hash Enrolled" : "Enrollment required"}
          tone={session.user?.faceVerified ? "success" : "default"}
        />
        <MetricCard
          label="Ballots Cast"
          value={myVote ? 1 : 0}
          hint={myVote ? "Receipt verified on ledger" : "No ballots submitted yet"}
          tone={myVote ? "success" : "default"}
        />
      </div>

      {/* Active Elections Section */}
      <Panel>
        <PanelHeader
          title="Eligible Elections"
          description="Elections open for voting in your jurisdiction."
        />

        <div className="divide-y divide-border">
          {elections.map((elec) => {
            const hasVotedInThis = myVote && myVote.electionId === elec.id;
            const isOpen = elec.status === "voting_open";

            return (
              <div key={elec.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <ElectionStatusBadge status={elec.status} />
                    {hasVotedInThis && <VotingStatusBadge status="vote_recorded" />}
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{elec.name}</h3>
                  <p className="text-xs text-muted-foreground max-w-xl">{elec.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {hasVotedInThis ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate({ to: "/voter/my-vote" })}
                      className="gap-1.5 text-xs text-success border-success/30 bg-success-soft/30"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>View Ballot Receipt</span>
                    </Button>
                  ) : isOpen ? (
                    <Button
                      size="sm"
                      onClick={() => navigate({ to: `/voter/elections/${elec.id}` as any })}
                      className="gap-1.5 text-xs shadow-raised"
                    >
                      <Vote className="size-3.5" />
                      <span>Cast Vote</span>
                      <ArrowRight className="size-3" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" disabled className="text-xs">
                      Voting Closed
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Security Assurance Banner */}
      <Panel className="p-5 bg-gradient-to-r from-surface to-muted/40 border-integrity/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-integrity-soft text-integrity">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Zero-Knowledge Ballot Sealing</h4>
              <p className="text-xs text-muted-foreground">
                Your vote selection is encrypted client-side before submission. Neither system admins nor election workers can decrypt individual voter choices.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0 text-xs gap-1.5">
            <Link to="/voter/my-vote">
              <Lock className="size-3.5" />
              <span>Inspect Cryptographic Ledger</span>
            </Link>
          </Button>
        </div>
      </Panel>
    </AppLayout>
  );
}
