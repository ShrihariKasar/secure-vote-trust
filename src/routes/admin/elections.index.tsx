import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Vote, PlusCircle, Search, BarChart3, Edit, ArrowRight } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader } from "@/components/app/surfaces";
import { ElectionStatusBadge } from "@/components/app/status-badge";
import { LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { electionService } from "@/services";
import type { Election } from "@/types";

export const Route = createFileRoute("/admin/elections/")({
  head: () => ({
    meta: [
      { title: "Manage Elections — SecureVote Trust" },
      { name: "description", content: "Elections registry and lifecycle management." },
    ],
  }),
  component: AdminElectionsIndexPage,
});

function AdminElectionsIndexPage() {
  const navigate = useNavigate();
  const [elections, setElections] = useState<Election[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const list = await electionService.list({
          search,
          status: statusFilter === "all" ? undefined : statusFilter,
        });
        setElections(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [search, statusFilter]);

  return (
    <AppLayout>
      <PageHeader
        title="Elections Registry"
        description="Configure electoral parameters, assign candidates, control voting window status, and view live turnout."
        actions={
          <Button onClick={() => navigate({ to: "/admin/elections/new" })} className="gap-2 shadow-raised">
            <PlusCircle className="size-4" />
            <span>Create New Election</span>
          </Button>
        }
      />

      <Panel>
        <PanelHeader
          title="Registered Elections"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search election name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 text-xs h-8">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="voting_open">Voting Open</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="voting_closed">Voting Closed</SelectItem>
                  <SelectItem value="results_published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />

        {loading ? (
          <LoadingState label="Loading elections" />
        ) : (
          <div className="divide-y divide-border">
            {elections.map((elec) => (
              <div key={elec.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <ElectionStatusBadge status={elec.status} />
                    <span className="font-mono text-xs text-muted-foreground">{elec.id}</span>
                  </div>
                  <h3 className="font-semibold text-base text-foreground leading-tight">{elec.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{elec.description}</p>
                </div>

                <div className="flex items-center gap-6 shrink-0 text-xs">
                  <div className="text-right">
                    <span className="text-muted-foreground">Votes Cast: </span>
                    <strong className="font-mono text-foreground">{elec.votesCast} / {elec.registeredVoters}</strong>
                    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-integrity"
                        style={{ width: `${Math.min(100, Math.round((elec.votesCast / (elec.registeredVoters || 1)) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => navigate({ to: `/admin/results/${elec.id}` as any })} className="gap-1 text-xs">
                      <BarChart3 className="size-3.5" />
                      <span>Results</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </AppLayout>
  );
}
