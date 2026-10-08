import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, CheckCircle2, RefreshCw, LogIn, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/app/surfaces";
import { ApprovalBadge } from "@/components/app/status-badge";
import { AppHeader } from "@/components/app/app-header";
import { voterService } from "@/services";
import { useSession } from "@/lib/session";
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

  const checkStatus = async () => {
    const voterId = session.pendingVoterId || session.user?.id;
    if (!voterId) return;

    setLoading(true);
    try {
      const v = await voterService.get(voterId);
      if (v) {
        setVoter(v);
      }
    } catch (err) {
      console.error("Failed to check approval status", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [session.pendingVoterId, session.user?.id]);

  const isApproved = voter?.approval === "approved";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg space-y-6">
          <Panel className="p-6 space-y-6 text-center">
            <div className={`inline-flex size-14 items-center justify-center rounded-full border-2 ${
              isApproved
                ? "border-success/30 bg-success-soft text-success"
                : "border-warning/30 bg-warning-soft text-warning"
            }`}>
              {isApproved ? <CheckCircle2 className="size-8" /> : <Clock className="size-8" />}
            </div>

            <div className="space-y-1.5">
              <h1 className="text-xl font-bold text-foreground">
                {isApproved ? "Voter Identity Approved!" : "Voter Registration Under Review"}
              </h1>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {isApproved
                  ? "Your application and biometric identity hash have been approved by the election administration. You may now sign in to access your ballot."
                  : "Your application and face biometric vector hash have been registered. An election administrator must approve your identity before ballot access is unlocked."}
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
              {isApproved ? (
                <Button
                  onClick={() => navigate({ to: "/login" })}
                  className="w-full gap-2 shadow-raised"
                >
                  <LogIn className="size-4" />
                  <span>Sign In with Your Credentials</span>
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  onClick={checkStatus}
                  disabled={loading}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                  <span>{loading ? "Checking Status..." : "Refresh Approval Status"}</span>
                </Button>
              )}

              <p className="text-[11px] text-muted-foreground">
                Election administrators review and approve voter applications in the Admin Console.
              </p>
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
}
