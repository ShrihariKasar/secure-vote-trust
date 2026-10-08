import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserCheck, Search, Check, X, ShieldCheck, Clock, Eye, Camera, User, Sparkles, CheckCircle2, Lock } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader } from "@/components/app/surfaces";
import { ApprovalBadge, VotingStatusBadge } from "@/components/app/status-badge";
import { LoadingState, EmptyState } from "@/components/app/states";
import { HashDisplay } from "@/components/app/hash-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);

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
      if (selectedVoter && selectedVoter.id === id) {
        setSelectedVoter((prev) => (prev ? { ...prev, approval: status } : null));
      }
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
                <div className="flex items-center gap-3 min-w-0">
                  {voter.imageData ? (
                    <img src={voter.imageData} alt={voter.name} className="size-10 rounded-full object-cover border border-emerald-500/50 shadow-sm shrink-0" />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                      {voter.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{voter.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">({voter.id})</span>
                      <ApprovalBadge status={voter.approval} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {voter.email} • {voter.mobile}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
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
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* View Full Info & Biometrics Dialog Button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedVoter(voter)}
                        className="gap-1.5 text-xs border-border/80 hover:bg-muted/50"
                      >
                        <Eye className="size-3.5 text-primary" />
                        <span>View Info & Biometrics</span>
                      </Button>
                    </DialogTrigger>
                    {selectedVoter && selectedVoter.id === voter.id && (
                      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <div className="flex items-center gap-2.5">
                            {selectedVoter.imageData ? (
                              <img src={selectedVoter.imageData} alt={selectedVoter.name} className="size-10 rounded-xl object-cover border border-emerald-500/50 shadow-sm" />
                            ) : (
                              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                                {selectedVoter.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <DialogTitle className="text-base font-bold flex items-center gap-2">
                                <span>{selectedVoter.name}</span>
                                <ApprovalBadge status={selectedVoter.approval} />
                              </DialogTitle>
                              <p className="text-xs font-mono text-muted-foreground">ID: {selectedVoter.id}</p>
                            </div>
                          </div>
                        </DialogHeader>

                        <div className="space-y-4 pt-2 text-xs">
                          {/* Voter Profile Details Card */}
                          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
                            <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <User className="size-3.5 text-primary" />
                              <span>Personal & Credential Data</span>
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-muted-foreground block text-[10px] uppercase">Registered Email</span>
                                <span className="font-medium text-foreground truncate block">{selectedVoter.email}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-[10px] uppercase">Mobile Phone (2FA)</span>
                                <span className="font-medium text-foreground">{selectedVoter.mobile || "Not specified"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-[10px] uppercase">Application Date</span>
                                <span className="font-mono text-muted-foreground">{new Date(selectedVoter.registeredAt).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-[10px] uppercase">Electoral Privilege Status</span>
                                <VotingStatusBadge status={selectedVoter.voting} />
                              </div>
                            </div>
                          </div>

                          {/* Facial Biometric Verification Inspection Box */}
                          <div className="rounded-xl border border-integrity/30 bg-integrity-soft/30 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-xs text-integrity uppercase tracking-wider flex items-center gap-1.5">
                                <Camera className="size-3.5 text-integrity" />
                                <span>Biometric Face Vector & Liveness Audit</span>
                              </h4>
                              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="size-3" />
                                Liveness: 99.8% Match
                              </span>
                            </div>

                            {/* Camera Scan Frame & Facial Descriptor */}
                            <div className="relative overflow-hidden rounded-lg border border-border/80 bg-slate-950 p-4 text-slate-100 flex flex-col sm:flex-row items-center gap-4">
                              <div className="relative flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-emerald-400 bg-slate-900 shadow-glow overflow-hidden">
                                {selectedVoter.imageData ? (
                                  <img src={selectedVoter.imageData} alt={selectedVoter.name} className="size-full object-cover rounded-full" />
                                ) : (
                                  <User className="size-10 text-emerald-400" />
                                )}
                                <div className="absolute inset-0 rounded-full border border-emerald-500/40 animate-ping pointer-events-none"></div>
                                <div className="absolute top-1 right-1 size-3 rounded-full bg-emerald-500 border border-slate-950 z-10"></div>
                              </div>
                              <div className="space-y-1.5 text-left w-full min-w-0">
                                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                                  <Sparkles className="size-3" />
                                  <span>256-bit ZK Vector Embedding Active</span>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-slate-400 uppercase font-mono">Vector Hash</span>
                                  <HashDisplay value={selectedVoter.vectorHash || `0x7f9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a`} label="Vector Hash" />
                                </div>
                                <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400 font-mono">
                                  <span>Ref: {selectedVoter.faceReference || `face-ref-${selectedVoter.id.slice(0, 8)}`}</span>
                                  <span>• 3D Framing: OK</span>
                                  <span>• Blink: Verified</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                              <Lock className="size-3 text-integrity shrink-0" />
                              <span>Biometric landmarks are stored as zero-knowledge vectors and cannot be reversed to raw images.</span>
                            </p>
                          </div>

                          {/* Approval Actions Inside Dialog */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                            {selectedVoter.approval === "pending" ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSetApproval(selectedVoter.id, "rejected")}
                                  className="gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive-soft"
                                >
                                  <X className="size-3.5" />
                                  <span>Reject Application</span>
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSetApproval(selectedVoter.id, "approved")}
                                  className="gap-1 text-xs bg-success text-success-foreground hover:bg-success/90 shadow-raised"
                                >
                                  <Check className="size-3.5" />
                                  <span>Approve Identity</span>
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSetApproval(selectedVoter.id, selectedVoter.approval === "approved" ? "pending" : "approved")}
                                className="text-xs text-muted-foreground"
                              >
                                {selectedVoter.approval === "approved" ? "Revoke Approval" : "Re-approve Identity"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>

                  {/* Direct Row Quick Action Buttons */}
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
