import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Vote, ArrowLeft, ArrowRight, CheckCircle2, User, FileText } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader, DefinitionList } from "@/components/app/surfaces";
import { ElectionStatusBadge } from "@/components/app/status-badge";
import { LoadingState, ErrorState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { electionService, candidateService } from "@/services";
import { sessionStore } from "@/lib/session";
import type { Election, Candidate } from "@/types";

export const Route = createFileRoute("/voter/elections/$id")({
  head: () => ({
    meta: [
      { title: "Select Candidate — SecureVote Trust" },
      { name: "description", content: "Select your preferred candidate." },
    ],
  }),
  component: ElectionCandidateSelectPage,
});

function ElectionCandidateSelectPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [elec, candList] = await Promise.all([
          electionService.get(id),
          candidateService.listByElection(id),
        ]);
        if (elec) setElection(elec);
        setCandidates(candList);
        if (candList.length > 0 && candList[0]) setSelectedCandidateId(candList[0].id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleProceed = () => {
    if (!selectedCandidateId) return;
    sessionStore.set({ draftCandidateId: selectedCandidateId });
    navigate({ to: `/voter/elections/${id}/review` as any });
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingState label="Loading candidate roster" />
      </AppLayout>
    );
  }

  if (!election) {
    return (
      <AppLayout>
        <ErrorState title="Election Not Found" description="The requested election does not exist." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/voter/dashboard" })} className="gap-1.5 text-xs">
          <ArrowLeft className="size-3.5" />
          <span>Back to Dashboard</span>
        </Button>

        <PageHeader
          title={election.name}
          description={election.description}
          actions={<ElectionStatusBadge status={election.status} />}
        />

        <Panel className="p-5">
          <DefinitionList
            columns={3}
            items={[
              { term: "Voting Starts", value: new Date(election.startAt).toLocaleString() },
              { term: "Voting Ends", value: new Date(election.endAt).toLocaleString() },
              { term: "Total Registered Voters", value: election.registeredVoters.toString() },
            ]}
          />
        </Panel>

        {/* Candidate Selection List */}
        <Panel>
          <PanelHeader
            title="Official Ballot Candidates"
            description="Select one candidate to cast your encrypted vote."
          />

          <div className="p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {candidates.map((cand) => {
                const isSelected = selectedCandidateId === cand.id;

                return (
                  <div
                    key={cand.id}
                    onClick={() => setSelectedCandidateId(cand.id)}
                    className={`cursor-pointer rounded-xl border p-5 transition-all flex flex-col justify-between space-y-4 ${
                      isSelected
                        ? "border-primary bg-primary-soft/40 shadow-raised ring-2 ring-primary"
                        : "border-border bg-surface hover:border-border-strong hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                          {cand.initials}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-base leading-tight">{cand.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{cand.position}</p>
                        </div>
                      </div>

                      <div className={`size-5 rounded-full border flex items-center justify-center ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                        {isSelected && <CheckCircle2 className="size-4" />}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-border/60">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <FileText className="size-3.5 text-integrity" />
                        <span>Candidate Manifesto</span>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed italic">
                        "{cand.manifesto}"
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={handleProceed} disabled={!selectedCandidateId} className="gap-2 shadow-raised">
                <span>Proceed to Review Selection</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    </AppLayout>
  );
}
