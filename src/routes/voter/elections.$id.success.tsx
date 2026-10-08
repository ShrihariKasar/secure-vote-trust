import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck, FileCheck2, ArrowRight, LayoutDashboard, History } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { Panel, PanelHeader, DefinitionList } from "@/components/app/surfaces";
import { HashDisplay } from "@/components/app/hash-display";
import { Button } from "@/components/ui/button";
import { voteService } from "@/services";
import { useSession } from "@/lib/session";
import type { VoteTransaction } from "@/types";

export const Route = createFileRoute("/voter/elections/$id/success")({
  head: () => ({
    meta: [
      { title: "Ballot Recorded — SecureVote Trust" },
      { name: "description", content: "Cryptographic vote receipt confirmed." },
    ],
  }),
  component: BallotSuccessPage,
});

function BallotSuccessPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const session = useSession();

  const [voteTx, setVoteTx] = useState<VoteTransaction | null>(null);

  useEffect(() => {
    async function loadVote() {
      if (!session.user?.id) return;
      const tx = await voteService.myVote(session.user.id);
      if (tx) setVoteTx(tx);
    }
    loadVote();
  }, [session.user?.id]);

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-6 max-w-2xl mx-auto">
        <Panel className="w-full p-8 space-y-6 text-center">
          <div className="inline-flex size-16 items-center justify-center rounded-full border-2 border-success/30 bg-success-soft text-success shadow-sm">
            <CheckCircle2 className="size-10 stroke-[2.5]" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Ballot Successfully Recorded & Sealed
            </h1>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Your vote has been cryptographically signed, zero-knowledge sealed, and permanently recorded in block ledger height{" "}
              <strong className="text-foreground">#{voteTx?.blockIndex ?? (voteTx ? "pending" : "—")}</strong>.
            </p>
          </div>

          {voteTx && (
            <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-semibold text-foreground">Cryptographic Verification Receipt</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                  <ShieldCheck className="size-3.5" />
                  <span>Signature Validated</span>
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-muted-foreground">Transaction ID Hash:</span>
                  <HashDisplay value={voteTx.transactionId} label="Transaction Hash" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-muted-foreground">Block Hash:</span>
                  <HashDisplay value={voteTx.blockHash} label="Block Hash" />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Block Height Index:</span>
                  <span className="font-mono font-semibold text-foreground">#{voteTx.blockIndex}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span className="font-mono text-muted-foreground">{new Date(voteTx.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
            <Button variant="outline" onClick={() => navigate({ to: "/voter/my-vote" })} className="gap-2 text-xs">
              <History className="size-3.5" />
              <span>View My Vote History</span>
            </Button>
            <Button onClick={() => navigate({ to: "/voter/dashboard" })} className="gap-2 text-xs shadow-raised">
              <LayoutDashboard className="size-3.5" />
              <span>Return to Voter Dashboard</span>
            </Button>
          </div>
        </Panel>
      </div>
    </AppLayout>
  );
}
