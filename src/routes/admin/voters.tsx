import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserCheck, Search, Check, X, ShieldCheck, Clock } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader } from "@/components/app/surfaces";
import { ApprovalBadge, VotingStatusBadge } from "@/components/app/status-badge";
import { LoadingState, EmptyState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { voterService } from "@/services";
import type { Voter, ApprovalStatus } from "@/types";

export const Route = createFileRoute("/admin/voters")({
  head: () => ({
    meta: [
      { title: "Voter Registry & Approvals — SecureVote Trust" },
      { name: "description", content: "Review and approve voter registration applications." },
    ],
  }),
  component: AdminVotersPage,
});

function AdminVotersPage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("pending");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await voterService.list();
      setVoters(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSetApproval = async (id: string, status: ApprovalStatus) => {
    try {
      await voterService.setApproval(id, status);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredVoters = voters.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.email.toLowerCase().includes(search.toLowerCase()) ||
      v.id.toLowerCase().includes(search.toLowerCase());
    if (statusTab === "all") return matchesSearch;
    return matchesSearch && v.approval === statusTab;
  });

  return (
    <AppLayout>
      <PageHeader
        title="Voter Registration & Verification Queue"
        description="Verify multi-factor identity credentials, review 256-bit biometric face vector hashes, and grant ballot privileges."
      />

      <Panel>
        <PanelHeader
          title="Voter Registry Queue"
          actions={
            <div className="relative w-56 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
          }
        />

        <div className="p-4 border-b border-border">
          <Tabs value={statusTab} onValueChange={setStatusTab}>
            <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-grid">
              <TabsTrigger value="pending" className="text-xs gap-1.5">
                <Clock className="size-3.5 text-warning" />
                <span>Pending Review</span>
              </TabsTrigger>
              <TabsTrigger value="approved" className="text-xs gap-1.5">
                <Check className="size-3.5 text-success" />
                <span>Approved</span>
              </TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs">
                <span>Rejected</span>
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs">
                <span>All Voters</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <LoadingState label="Loading voter queue" />
        ) : filteredVoters.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No Voters Found"
            description={`No voter records match the current filter (${statusTab}).`}
          />
        ) : (
          <div className="divide-y divide-border">
            {filteredVoters.map((voter) => (
              <div key={voter.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{voter.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">({voter.id})</span>
                    <ApprovalBadge status={voter.approval} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {voter.email} • {voter.mobile}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    {voter.faceEnrolled ? (
                      <span className="inline-flex items-center gap-1 rounded bg-integrity-soft px-1.5 py-0.5 text-[10px] font-medium text-integrity">
                        <ShieldCheck className="size-3" />
                        <span>Biometrics Enrolled</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">No Biometrics</span>
                    )}
                    <VotingStatusBadge status={voter.voting} />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {voter.approval === "pending" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetApproval(voter.id, "rejected")}
                        className="gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive-soft"
                      >
                        <X className="size-3.5" />
                        <span>Reject</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSetApproval(voter.id, "approved")}
                        className="gap-1 text-xs bg-success text-success-foreground hover:bg-success/90 shadow-raised"
                      >
                        <Check className="size-3.5" />
                        <span>Approve Identity</span>
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSetApproval(voter.id, voter.approval === "approved" ? "pending" : "approved")}
                      className="text-xs text-muted-foreground"
                    >
                      {voter.approval === "approved" ? "Revoke Approval" : "Re-approve"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </AppLayout>
  );
}
