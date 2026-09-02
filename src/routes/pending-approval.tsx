import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, Clock, CheckCircle2, RefreshCw, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/app/surfaces";
import { ApprovalBadge } from "@/components/app/status-badge";
import { AppHeader } from "@/components/app/app-header";
import { voterService, authService } from "@/services";
import { sessionStore, useSession } from "@/lib/session";
import type { Voter } from "@/types";

export const Route = createFileRoute("/pending-approval")({
  head: () => ({
    meta: [
      { title: "Pending Approval — SecureVote Trust" },
      { name: "description", content: "Your voter registration application status." },
    ],
  }),
  component: PendingApprovalPage,
});

function PendingApprovalPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [voter, setVoter] = useState<Voter | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkVoter() {
      // Find pending voter or default demo voter
      const voters = await voterService.list();
      const match = voters.find((v) => v.approval === "pending") || voters[0];
      if (match) {
        setVoter(match);
      }
    }
    checkVoter();
  }, []);

  const handleSimulateApproval = async () => {
    if (!voter) return;
    setLoading(true);
    try {
      // Update voter status to approved in service
      await voterService.setApproval(voter.id, "approved");
      
      // Auto sign in demo voter
      const user = await authService.signInDemo("voter");
      sessionStore.set({ user });

      navigate({ to: "/voter/dashboard" });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg space-y-6">
          <Panel className="p-6 space-y-6 text-center">
            <div className="inline-flex size-14 items-center justify-center rounded-full border-2 border-warning/30 bg-warning-soft text-warning">
              <Clock className="size-8" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-xl font-bold text-foreground">Voter Registration Under Review</h1>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Your application and face biometric vector hash have been registered. An election administrator must approve your identity before ballot access is unlocked.
              </p>
            </div>

            {voter && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs space-y-2 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Applicant Name:</span>
                  <span className="font-semibold text-foreground">{voter.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Voter ID Reference:</span>
                  <span className="font-mono text-foreground">{voter.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status:</span>
                  <ApprovalBadge status={voter.approval} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Registered At:</span>
                  <span className="font-mono text-muted-foreground">{new Date(voter.registeredAt).toLocaleDateString()}</span>
                </div>
              </div>
            )}

            <div className="pt-2 space-y-3">
              <Button
                onClick={handleSimulateApproval}
                disabled={loading}
                className="w-full gap-2 shadow-raised"
              >
                {loading ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Approving Application...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="size-4" />
                    <span>Simulate Admin Instant Approval & Enter Portal</span>
                  </>
                )}
              </Button>

              <p className="text-[11px] text-muted-foreground">
                In production, election admins review identity credentials via the Admin Console.
              </p>
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
}
