import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Vote, ArrowLeft, ArrowRight, CheckCircle2, User, FileText, Briefcase } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { Panel } from "@/components/app/surfaces";
import { ElectionStatusBadge } from "@/components/app/status-badge";
import { LoadingState, ErrorState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { electionService, candidateService } from "@/services";
import { sessionStore } from "@/lib/session";
import { CandidatePartySymbol } from "@/components/app/candidate-party-symbol";
import { CandidateWorkHistoryDialog } from "@/components/app/candidate-work-history-dialog";
import type { Election, Candidate } from "@/types";

export const Route = createFileRoute("/voter/elections/$id/")({
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

  // Normalize id in case of spaces (e.g. 'el 01' -> 'el-01')
  const electionId = (id ? decodeURIComponent(id).replace(/\s+/g, "-") : "") || "el-01";

  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyCandidate, setHistoryCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [elec, candList] = await Promise.all([
          electionService.get(electionId),
          candidateService.listByElection(electionId),
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
  }, [electionId]);

  const handleProceed = () => {
    if (!selectedCandidateId) return;
    sessionStore.set({ draftCandidateId: selectedCandidateId });
    navigate({ to: `/voter/elections/${electionId}/review` as any });
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
      <div className="space-y-3">
        {/* Compact Header Bar - Moved Up */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/voter/dashboard" })}
              className="h-7 text-xs gap-1.5 px-2 hover:bg-muted shrink-0"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back</span>
            </Button>
            <div className="h-4 w-px bg-border shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-foreground truncate">
                {election.name}
              </h1>
              <p className="text-[11px] text-muted-foreground truncate">
                {election.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ElectionStatusBadge status={election.status} />
            <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border font-medium">
              Ends: {new Date(election.endAt).toLocaleDateString()}
            </span>
            <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border font-medium">
              {election.registeredVoters} Voters
            </span>
          </div>
        </div>

        {/* Small Square Candidate Cards (3-Column Grid) */}
        <Panel className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Official Ballot Candidates
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Select one candidate to cast your encrypted zero-knowledge vote.
              </p>
            </div>
            <span className="text-[11px] text-primary font-semibold">
              {candidates.length} Contesting Candidates
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {candidates.map((cand) => {
              const isSelected = selectedCandidateId === cand.id;
              return (
                <div
                  key={cand.id}
                  onClick={() => setSelectedCandidateId(cand.id)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between h-[230px] relative group ${
                    isSelected
                      ? "border-primary bg-primary-soft/40 shadow-raised ring-2 ring-primary"
                      : "border-border bg-surface hover:border-primary/50 hover:bg-muted/20"
                  }`}
                >
                  {/* Card Header: Avatar, Name, Selection Check */}
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-sm shadow-xs">
                        {cand.initials}
                      </div>
                      <div
                        className={`size-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-xs"
                            : "border-border group-hover:border-primary/60"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="size-3.5" />}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-foreground text-sm leading-tight truncate">
                        {cand.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                        {cand.position}
                      </p>
                    </div>

                    <div className="pt-0.5">
                      <CandidatePartySymbol
                        symbol={cand.symbol}
                        symbolImage={cand.symbolImage}
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* Card Body: Compact Manifesto Snippet */}
                  <div className="rounded-md bg-muted/30 border border-border/40 p-2 text-[10.5px] text-foreground/80 italic line-clamp-2 leading-relaxed">
                    "{cand.manifesto}"
                  </div>

                  {/* Card Footer: Past Work History Button */}
                  <div className="pt-1.5 border-t border-border/50">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistoryCandidate(cand);
                      }}
                      className="h-6 w-full text-[11px] gap-1.5 text-primary border-primary/30 hover:bg-primary-soft/50 shadow-2xs font-medium"
                    >
                      <Briefcase className="size-3" />
                      <span>Past Work History</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <CandidateWorkHistoryDialog
            candidate={historyCandidate}
            open={Boolean(historyCandidate)}
            onOpenChange={(o) => !o && setHistoryCandidate(null)}
          />

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-between border-t border-border/60">
            <span className="text-[11px] text-muted-foreground">
              Candidate selected:{" "}
              <strong className="text-foreground">
                {candidates.find((c) => c.id === selectedCandidateId)?.name || "None"}
              </strong>
            </span>
            <Button
              onClick={handleProceed}
              disabled={!selectedCandidateId}
              size="sm"
              className="gap-2 shadow-raised h-8 text-xs font-semibold px-4"
            >
              <span>Proceed to Review Selection</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </Panel>
      </div>
    </AppLayout>
  );
}
