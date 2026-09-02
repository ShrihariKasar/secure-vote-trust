import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck, Lock, CheckCircle2, UserCheck } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader, DefinitionList } from "@/components/app/surfaces";
import { LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { electionService, candidateService } from "@/services";
import { useSession } from "@/lib/session";
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

  const [election, setElection] = useState<Election | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [elec, candList] = await Promise.all([
          electionService.get(id),
          candidateService.listByElection(id),
        ]);
        if (elec) setElection(elec);

        const draftId = session.draftCandidateId || candList[0]?.id;
        const matched = candList.find((c) => c.id === draftId) || candList[0];
        if (matched) setCandidate(matched);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, session.draftCandidateId]);

  const handleConfirmReview = () => {
    navigate({ to: `/voter/elections/${id}/verify` as any });
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingState label="Preparing ballot preview" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: `/voter/elections/${id}` as any })} className="gap-1.5 text-xs">
          <ArrowLeft className="size-3.5" />
          <span>Change Candidate Selection</span>
        </Button>

        <PageHeader
          title="Review Your Unsubmitted Ballot"
          description="Please double-check your candidate choice. After biometric authorization, your vote will be sealed into the blockchain ledger."
        />

        <Panel className="p-6 space-y-6">
          <div className="rounded-xl border border-primary/30 bg-primary-soft/40 p-5 flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl">
              {candidate?.initials}
            </div>
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Selected Candidate</span>
              <h3 className="text-lg font-bold text-foreground leading-tight">{candidate?.name}</h3>
              <p className="text-xs text-muted-foreground">{candidate?.position}</p>
            </div>
          </div>

          <DefinitionList
            columns={2}
            items={[
              { term: "Election", value: election?.name },
              { term: "Voter Identity", value: session.user?.name || "Dr. Aris Thorne" },
              { term: "Encryption Standard", value: "Zero-Knowledge SHA-256 Vector" },
              { term: "Immutability Guarantee", value: "Signed via Biometric Sensor" },
            ]}
          />

          <div className="rounded-lg border border-warning/30 bg-warning-soft/40 p-4 text-xs text-warning flex items-start gap-2.5">
            <ShieldCheck className="size-4 shrink-0 mt-0.5" />
            <span>
              <strong>Final Check:</strong> Step 2 requires biometric facial liveness authentication to generate your ballot ZK proof signature.
            </span>
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button variant="outline" size="sm" onClick={() => navigate({ to: `/voter/elections/${id}` as any })} className="text-xs">
              Change Selection
            </Button>
            <Button onClick={handleConfirmReview} className="gap-2 shadow-raised">
              <Lock className="size-4" />
              <span>Proceed to Biometric Verification</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </Panel>
      </div>
    </AppLayout>
  );
}
