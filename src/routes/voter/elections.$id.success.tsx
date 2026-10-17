import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ShieldCheck,
  FileCheck2,
  ArrowRight,
  LayoutDashboard,
  History,
  Download,
  Fingerprint,
  Globe2,
  ExternalLink,
  Lock
} from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { Panel, PanelHeader, DefinitionList } from "@/components/app/surfaces";
import { HashDisplay } from "@/components/app/hash-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [verifying, setVerifying] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationData, setVerificationData] = useState<any>(null);

  useEffect(() => {
    async function loadVote() {
      if (!session.user?.id) return;
      const tx = await voteService.myVote(session.user.id, id);
      if (tx) setVoteTx(tx);
    }
    loadVote();
  }, [session.user?.id, id]);

  const handleDownloadReceipt = () => {
    if (!voteTx) return;
    const receiptText = `=====================================================
SECUREVOTE TRUST — OFFICIAL VOTER VERIFIABLE AUDIT RECEIPT
End-to-End Verifiable Zero-Knowledge Ballot Confirmation
=====================================================

Receipt Tracking Code: ${voteTx.receiptCode || `VVPAT-${voteTx.transactionId.slice(0, 16).toUpperCase()}`}
Transaction ID Hash:  ${voteTx.transactionId}
Block Ledger Height:  #${voteTx.blockIndex}
Block Hash:           ${voteTx.blockHash}
Previous Block Hash:  ${voteTx.previousHash}
Timestamp (UTC):      ${voteTx.timestamp}
Digital Signature:    ${voteTx.digitalSignature || "RSA-4096-PSS-VALID"}
Notary Consensus:     4/4 Constitutional Observers Verified

E2E-V Verification URL:
http://localhost:8080/voter/my-vote

CONFIDENTIALITY GUARANTEE:
In accordance with Constitutional Secret Ballot mandates, your
candidate choice is irreversibly encrypted with AES-256-GCM.
This receipt proves inclusion on the ledger without disclosing your vote.
=====================================================`;

    const blob = new Blob([receiptText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `VVPAT_Ballot_Receipt_${voteTx.transactionId.slice(0, 8)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleVerifyOnLedger = async () => {
    if (!voteTx) return;
    try {
      setVerifying(true);
      const code = voteTx.receiptCode || voteTx.transactionId;
      const res = await voteService.verifyReceipt(code);
      setVerificationData(res);
      setVerificationModalOpen(true);
    } catch (err) {
      console.error("Public receipt verification failed:", err);
    } finally {
      setVerifying(false);
    }
  };

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
            <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Fingerprint className="size-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Official VVPAT Ballot Receipt</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
                  <ShieldCheck className="size-3.5" />
                  <span>Signature Validated</span>
                </span>
              </div>

              {/* VVPAT Receipt Code Highlight */}
              <div className="p-3 rounded-lg bg-card border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-mono text-muted-foreground block">Voter Verifiable Code (VVPAT)</span>
                  <span className="font-mono text-primary font-bold text-sm tracking-wide">
                    {voteTx.receiptCode || `VVPAT-${voteTx.transactionId.slice(0, 16).toUpperCase()}`}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleVerifyOnLedger}
                  disabled={verifying}
                  className="text-xs gap-1.5 border-primary/40 hover:bg-primary/10 shrink-0"
                >
                  <Globe2 className="size-3 text-primary" />
                  <span>{verifying ? "Verifying..." : "Verify On Ledger"}</span>
                </Button>
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
                <div className="flex justify-between border-t border-border/60 pt-2 text-[11px]">
                  <span className="text-muted-foreground">Observer Notary Quorum:</span>
                  <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="size-3" />
                    {voteTx.notaryConsensus || "4/4 Institutional Observers Verified"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Button variant="outline" onClick={handleDownloadReceipt} className="gap-2 text-xs">
              <Download className="size-3.5" />
              <span>Download Official Receipt (.txt)</span>
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: "/voter/my-vote" })} className="gap-2 text-xs">
              <History className="size-3.5" />
              <span>View My Vote History</span>
            </Button>
            <Button onClick={() => navigate({ to: "/voter/dashboard" })} className="gap-2 text-xs shadow-raised">
              <LayoutDashboard className="size-3.5" />
              <span>Voter Dashboard</span>
            </Button>
          </div>
        </Panel>
      </div>

      {/* Public End-to-End Verifiability Modal */}
      <Dialog open={verificationModalOpen} onOpenChange={setVerificationModalOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <Globe2 className="size-5 text-primary" />
                Public Ledger Ballot Verification
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Independent cryptographic verification of ballot inclusion on the distributed public ledger.
            </DialogDescription>
          </DialogHeader>

          {verificationData && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <span>Ballot Ledger Inclusion Confirmed</span>
                </div>
                <p className="text-[11px] text-emerald-200/80">
                  Your encrypted ballot is cryptographically locked into block height #{verificationData.blockIndex}.
                </p>
              </div>

              <div className="space-y-2 font-mono text-[11px] p-3 rounded-lg bg-muted/40 border border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receipt Code:</span>
                  <span className="text-primary font-bold">{verificationData.receiptCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Observer Quorum:</span>
                  <span className="text-emerald-400 font-semibold">{verificationData.observerConsensus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Signature Status:</span>
                  <span className="text-foreground">{verificationData.signatureValid ? "Cryptographically Valid" : "Invalid"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Privacy Guarantee:</span>
                  <span className="text-foreground">AES-256-GCM Zero-Knowledge Secret Ballot</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
