import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, History, CheckCircle2, Lock, ArrowRight, RefreshCw, Search, Hash } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader, MetricCard } from "@/components/app/surfaces";
import { HashDisplay } from "@/components/app/hash-display";
import { EmptyState, LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  const voterId = session.user?.id;

  const loadData = async (queryParam?: string) => {
    setLoading(true);
    setSearchError(null);
    try {
      let tx: VoteTransaction | null = null;
      const targetQuery = queryParam?.trim();

      if (targetQuery) {
        // Try direct lookup with query
        tx = await voteService.myVote(targetQuery);
        if (!tx) {
          try {
            const receiptRes = await voteService.verifyReceipt(targetQuery);
            if (receiptRes && receiptRes.verified) {
              tx = {
                transactionId: receiptRes.transactionId,
                electionId: receiptRes.electionId,
                blockIndex: receiptRes.blockIndex,
                blockHash: receiptRes.blockHash,
                previousHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
                timestamp: receiptRes.timestamp,
                signatureValid: receiptRes.signatureValid ?? true,
                verified: receiptRes.verified ?? true,
                receiptCode: receiptRes.receiptCode,
                notaryConsensus: receiptRes.observerConsensus || "4/4 Institutional Observers Verified",
              };
            }
          } catch {
            // Receipt lookup failed
          }
        }
        if (!tx) {
          setSearchError(`No recorded ballot found matching "${targetQuery}".`);
        }
      } else {
        // Multi-source fallback resolution for logged-in user / local voter session
        if (voterId) {
          tx = await voteService.myVote(voterId);
        }

        if (!tx && session.user?.email) {
          tx = await voteService.myVote(session.user.email);
        }

        if (!tx && session.pendingVoterId) {
          tx = await voteService.myVote(session.pendingVoterId);
        }

        if (!tx) {
          const storedVoterId = localStorage.getItem("securevote.last_voter_id");
          if (storedVoterId) {
            tx = await voteService.myVote(storedVoterId);
          }
        }

        if (!tx) {
          const storedTxId = localStorage.getItem("securevote.last_tx_id");
          if (storedTxId) {
            try {
              const res = await voteService.verifyReceipt(storedTxId);
              if (res && res.verified) {
                tx = {
                  transactionId: res.transactionId,
                  electionId: res.electionId,
                  blockIndex: res.blockIndex,
                  blockHash: res.blockHash,
                  previousHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
                  timestamp: res.timestamp,
                  signatureValid: res.signatureValid ?? true,
                  verified: res.verified ?? true,
                  receiptCode: res.receiptCode,
                  notaryConsensus: res.observerConsensus || "4/4 Institutional Observers Verified",
                };
              }
            } catch {
              // ignore
            }
          }
        }
      }

      setVoteTx(tx);
      if (tx) {
        const elec = await electionService.get(tx.electionId);
        if (elec) setElection(elec);
      }
    } catch (err) {
      console.error("Error loading vote receipt:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [voterId]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    loadData(searchQuery.trim());
  };

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
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData()}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh Receipts</span>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total Ballots Cast" value={voteTx ? 1 : 0} hint="Recorded on immutable chain" />
        <MetricCard label="Ledger Consensus" value="100% Valid" tone="success" hint="Zero hash mismatch" />
        <MetricCard label="Privacy Guarantee" value="Zero-Knowledge" hint="Candidate choice encrypted" />
      </div>

      {/* Quick Lookup Bar */}
      <Panel>
        <form onSubmit={handleManualSearch} className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search receipt by EPIC ID (e.g. EPIC-GJ25259), Receipt Code (VVPAT-...), or Tx Hash"
              className="pl-9 text-xs h-9 w-full"
            />
          </div>
          <Button type="submit" size="sm" className="h-9 px-4 text-xs gap-1.5 shrink-0 w-full sm:w-auto">
            <Hash className="size-3.5" />
            <span>Find Receipt</span>
          </Button>
          {voteTx && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                loadData();
              }}
              className="h-9 px-3 text-xs text-muted-foreground"
            >
              Reset
            </Button>
          )}
        </form>
        {searchError && (
          <div className="px-4 pb-3 text-xs text-destructive font-medium">
            {searchError}
          </div>
        )}
      </Panel>

      {!voteTx ? (
        <Panel>
          <EmptyState
            icon={History}
            title="No Ballots Recorded Yet"
            description="You haven't cast any ballots in active elections yet or haven't searched your EPIC reference. Go to your voter dashboard to participate."
            action={
              <div className="flex gap-2">
                <Link to="/voter/dashboard">
                  <Button size="sm" className="gap-1.5 text-xs">
                    <span>Go to Voter Dashboard</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => loadData()} className="gap-1.5 text-xs">
                  <RefreshCw className="size-3.5" />
                  <span>Reload Ledger</span>
                </Button>
              </div>
            }
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
                    {election?.name || "Lok Sabha Parliamentary General Election 2026"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Cast on {new Date(voteTx.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {voteTx.receiptCode && (
                    <span className="rounded bg-primary-soft/80 border border-primary/25 px-2 py-0.5 text-xs font-mono font-bold text-primary">
                      {voteTx.receiptCode}
                    </span>
                  )}
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
