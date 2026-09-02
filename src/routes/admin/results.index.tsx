import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, ShieldCheck, ArrowRight, Vote } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader } from "@/components/app/surfaces";
import { ElectionStatusBadge } from "@/components/app/status-badge";
import { LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { resultService, electionService } from "@/services";
import type { Election } from "@/types";

export const Route = createFileRoute("/admin/results/")({
  head: () => ({
    meta: [
      { title: "Election Results — SecureVote Trust" },
      { name: "description", content: "Public & Admin election tally results." },
    ],
  }),
  component: AdminResultsIndexPage,
});

function AdminResultsIndexPage() {
  const navigate = useNavigate();
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const list = await electionService.list();
        setElections(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <AppLayout>
      <PageHeader
        title="Election Tallies & Analytics"
        description="Publicly audit cryptographic election tallies, voter turnout percentages, and verified candidate rankings."
      />

      <Panel>
        <PanelHeader
          title="Select Election to View Tallies"
          description="Elections with completed or active voting."
        />

        {loading ? (
          <LoadingState label="Loading election tallies" />
        ) : (
          <div className="divide-y divide-border">
            {elections.map((elec) => (
              <div key={elec.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <ElectionStatusBadge status={elec.status} />
                    <span className="font-mono text-xs text-muted-foreground">{elec.id}</span>
                  </div>
                  <h3 className="font-semibold text-base text-foreground">{elec.name}</h3>
                  <p className="text-xs text-muted-foreground">{elec.description}</p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right text-xs">
                    <p className="font-bold numeric text-foreground">{elec.votesCast} / {elec.registeredVoters}</p>
                    <p className="text-muted-foreground">Votes Recorded</p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => navigate({ to: `/admin/results/${elec.id}` as any })}
                    className="gap-1.5 text-xs shadow-raised"
                  >
                    <BarChart3 className="size-3.5" />
                    <span>View Analytics</span>
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </AppLayout>
  );
}
