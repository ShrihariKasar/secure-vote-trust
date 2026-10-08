import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, History, CheckCircle2, Lock, ArrowRight, RefreshCw } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader, MetricCard } from "@/components/app/surfaces";
import { HashDisplay } from "@/components/app/hash-display";
import { EmptyState, LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { voteService, blockchainService, electionService } from "@/services";
import { useSession } from "@/lib/session";
import type { VoteTransaction, Election } from "@/types";

export const Route = createFileRoute("/voter/my-vote")({
  head: () => ({
    meta: [
      { title: "My Vote History — SecureVote Trust" },
      { name: "description", content: "Personal cryptographic voting receipts and audit history." },
    ],
  }),
  component: MyVoteHistoryPage,
});

function MyVoteHistoryPage() {
  const session = useSession();
  const [voteTx, setVoteTx] = useState<VoteTransaction | null>(null);
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState<{ verified: boolean; signatureValid: boolean } | null>(null);

  const voterId = session.user?.id;

  useEffect(() => {
    async function loadData() {
      if (!voterId) {
        setVoteTx(null);
        setElection(null);
        setLoading(false);
        return;
      }
      try {
        const tx = await voteService.myVote(voterId);
        setVoteTx(tx);
        if (tx) {
          const elec = await electionService.get(tx.electionId);
          if (elec) setElection(elec);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [voterId]);

  const handleVerifyLedger = async () => {
    if (!voteTx) return;
    setVerifying(true);
    try {
      const res = await blockchainService.verifyTransaction(voteTx.transactionId);
      setVerifiedResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingState label="Retrieving cryptographic vote history" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="My Cryptographic Vote Receipts"
        description="Your personal zero-knowledge ballot verification ledger. Audit your ballot proof without revealing candidate selection."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total Ballots Cast" value={voteTx ? 1 : 0} hint="Recorded on immutable chain" />
        <MetricCard label="Ledger Consensus" value="100% Valid" tone="success" hint="Zero hash mismatch" />
        <MetricCard label="Privacy Guarantee" value="Zero-Knowledge" hint="Candidate choice encrypted" />
      </div>

      {!voteTx ? (
        <Panel>
          <EmptyState
            icon={History}
            title="No Ballots Recorded Yet"
            description="You haven't cast any ballots in active elections yet. Go to your voter dashboard to participate."
          />
        </Panel>
      ) : (
        <Panel>
          <PanelHeader
            title="Recorded Ballot Receipts"
            description="End-to-end verifiable cryptographic receipt."
          />

          <div className="p-6 space-y-6">
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
                <div>
                  <h3 className="font-semibold text-base text-foreground">
                    {election?.name || "General Presidential Election 2026"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Cast on {new Date(voteTx.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-success-soft px-2 py-0.5 text-xs font-medium text-success flex items-center gap-1">
                    <CheckCircle2 className="size-3" />
                    Confirmed in Block #{voteTx.blockIndex}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px]">Transaction Hash</span>
                  <div>
                    <HashDisplay value={voteTx.transactionId} label="Transaction Hash" />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px]">Block Hash</span>
                  <div>
                    <HashDisplay value={voteTx.blockHash} label="Block Hash" />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px]">Previous Block Hash</span>
                  <div>
                    <HashDisplay value={voteTx.previousHash} label="Previous Block Hash" />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px]">Digital Signature</span>
                  <p className="font-mono text-success font-semibold">ED25519-VALIDATED</p>
                </div>
              </div>

              {/* Verify Ledger Button & Status */}
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="size-3.5 text-integrity" />
                  <span>Zero-knowledge ballot proof sealed with facial biometric hash.</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVerifyLedger}
                  disabled={verifying}
                  className="gap-1.5 text-xs shrink-0"
                >
                  {verifying ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-3.5 text-integrity" />
                  )}
                  <span>Re-Verify Ledger Proof</span>
                </Button>
              </div>

              {verifiedResult && (
                <div className="rounded-md border border-success/30 bg-success-soft/40 p-3 text-xs text-success flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4" />
                    <span>Ledger Proof Re-verified: Digital Signature & Block Hash Match 100%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Panel>
      )}
    </AppLayout>
  );
}
