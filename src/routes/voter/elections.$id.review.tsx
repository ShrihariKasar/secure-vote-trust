import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck, Lock, CheckCircle2, UserCheck, Vote, Briefcase } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader, DefinitionList } from "@/components/app/surfaces";
import { LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { electionService, candidateService } from "@/services";
import { useSession } from "@/lib/session";
import { CandidatePartySymbol } from "@/components/app/candidate-party-symbol";
import { CandidateWorkHistoryDialog } from "@/components/app/candidate-work-history-dialog";
import type { Election, Candidate } from "@/types";

export const Route = createFileRoute("/voter/elections/$id/review")({
  head: () => ({
    meta: [
      { title: "Review Ballot — SecureVote Trust" },
      { name: "description", content: "Review your ballot candidate selection." },
    ],
  }),
  component: ReviewBallotPage,
});

function ReviewBallotPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const session = useSession();

  // Normalize id in case of spaces (e.g. 'el 01' -> 'el-01')
  const electionId = (id ? decodeURIComponent(id).replace(/\s+/g, "-") : "") || "el-01";

  const [election, setElection] = useState<Election | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [workHistoryOpen, setWorkHistoryOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [elec, candList] = await Promise.all([
          electionService.get(electionId),
          candidateService.listByElection(electionId),
        ]);
        if (elec) setElection(elec);

        const draftId = session.draftCandidateId;
        const matched = (draftId ? candList.find((c) => c.id === draftId) : null) || candList[0] || null;
        if (matched) setCandidate(matched);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [electionId, session.draftCandidateId]);

  const handleConfirmReview = () => {
    navigate({ to: `/voter/elections/${electionId}/verify` as any });
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingState label="Preparing ballot preview" />
      </AppLayout>
    );
  }

  const candidateInitials = candidate?.initials || (candidate?.name ? candidate.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "RS");
  const candidateName = candidate?.name || "Dr. Rajeshwar Sharma";
  const candidatePosition = candidate?.position || "Lok Sabha Member of Parliament";

  return (
    <AppLayout>
      <div className="space-y-4 max-w-2xl mx-auto">
        {/* Compact Top Navigation Bar */}
        <div className="flex items-center justify-between pb-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: `/voter/elections/${electionId}` as any })}
            className="gap-1.5 text-xs h-7 px-2"
          >
            <ArrowLeft className="size-3.5" />
            <span>Change Candidate Selection</span>
          </Button>

          <span className="text-[11px] text-muted-foreground font-medium">
            Step 1 of 3: Ballot Review
          </span>
        </div>

        {/* Selected Candidate Review Panel */}
        <Panel className="p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Selected Ballot Choice
            </h2>
            <span className="text-[10px] bg-primary-soft/80 text-primary font-bold px-2 py-0.5 rounded border border-primary/20">
              Unsubmitted Ballot
            </span>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary-soft/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-base shadow-xs">
                {candidateInitials}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Selected Candidate
                </span>
                <h3 className="text-base font-bold text-foreground leading-tight truncate">
                  {candidateName}
                </h3>
                <p className="text-xs text-muted-foreground truncate">{candidatePosition}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <CandidatePartySymbol
                    symbol={candidate?.symbol}
                    symbolImage={candidate?.symbolImage}
                    badgeClassName="bg-background/80"
                  />
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWorkHistoryOpen(true)}
              className="gap-1.5 text-xs border-primary/40 bg-background/80 hover:bg-primary-soft/60 shrink-0 self-start sm:self-center shadow-2xs h-7 px-2.5 font-medium"
            >
              <Briefcase className="size-3 text-primary" />
              <span>View Past Work History</span>
            </Button>
          </div>

          <CandidateWorkHistoryDialog
            candidate={candidate}
            open={workHistoryOpen}
            onOpenChange={setWorkHistoryOpen}
          />

          <DefinitionList
            columns={2}
            items={[
              { term: "Election", value: election?.name || "Lok Sabha Parliamentary General Election 2026" },
              { term: "Candidate Sign", value: candidate?.symbol?.startsWith("data:") ? "Custom Party Icon (Uploaded from Device)" : (candidate?.symbol || "🪷 Lotus (कमल / BJP)") },
              { term: "Voter Identity", value: session.user?.name || session.user?.email || "Rajesh Kumar" },
              { term: "Encryption Standard", value: "Zero-Knowledge SHA-256 Vector" },
              { term: "Immutability Guarantee", value: "Signed via Biometric Sensor" },
            ]}
          />

          <div className="rounded-lg border border-warning/30 bg-warning-soft/40 p-3 text-xs text-warning flex items-start gap-2.5">
            <ShieldCheck className="size-4 shrink-0 mt-0.5" />
            <span>
              <strong>Final Check:</strong> Step 2 requires biometric facial liveness authentication to generate your ballot ZK proof signature.
            </span>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: `/voter/elections/${electionId}` as any })}
              className="text-xs h-8"
            >
              Change Selection
            </Button>
            <Button onClick={handleConfirmReview} size="sm" className="gap-2 shadow-raised h-8 text-xs font-semibold px-4">
              <Lock className="size-3.5" />
              <span>Proceed to Biometric Verification</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </Panel>
      </div>
    </AppLayout>
  );
}
