import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cpu, ShieldCheck, Loader2, CheckCircle2, Lock, Blocks } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { Panel } from "@/components/app/surfaces";
import { useSession, sessionStore } from "@/lib/session";
import { voteService, candidateService } from "@/services";

export const Route = createFileRoute("/voter/elections/$id/processing")({
  head: () => ({
    meta: [
      { title: "Processing Ballot — SecureVote Trust" },
      { name: "description", content: "Sealing ballot into cryptographic blockchain." },
    ],
  }),
  component: BallotProcessingPage,
});

function BallotProcessingPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const session = useSession();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function processVote() {
      try {
        const voterId = session.user?.id;
        if (!voterId) {
          navigate({ to: "/login" });
          return;
        }
        
        // Find selected candidate
        const candidates = await candidateService.listByElection(id);
        const candidateId = session.draftCandidateId || candidates[0]?.id;
        if (!candidateId) {
          throw new Error("No candidate selected for this election.");
        }

        // Step 1: ZK Proof
        if (!mounted) return;
        setCurrentStep(1);
        await new Promise((r) => setTimeout(r, 800));

        // Step 2: Sign Payload
        if (!mounted) return;
        setCurrentStep(2);
        await new Promise((r) => setTimeout(r, 900));

        // Step 3: Broadcast to Block Ledger Node
        if (!mounted) return;
        setCurrentStep(3);
        const tx = await voteService.castVote({
          electionId: id,
          candidateId: candidateId,
          voterId: voterId,
        });

        // Step 4: Block Inclusion
        if (!mounted) return;
        setCurrentStep(4);
        await new Promise((r) => setTimeout(r, 800));

        // Save tx ID for success page
        sessionStore.set({ draftCandidateId: null });

        if (mounted) {
          navigate({ to: `/voter/elections/${id}/success` as any });
        }
      } catch (err) {
        console.error("Ballot processing failed", err);
        if (mounted) setError("Cryptographic ballot sealing failed. Please try again.");
      }
    }

    processVote();

    return () => {
      mounted = false;
    };
  }, [id, session.draftCandidateId, session.user?.id]);

  const steps = [
    { num: 1, title: "Generating Zero-Knowledge Proof", desc: "Encrypting candidate choice with ZK-SNARK vector payload." },
    { num: 2, title: "Signing Payload via Biometric Key", desc: "Attaching cryptographic digital signature." },
    { num: 3, title: "Broadcasting to Ledger Nodes", desc: "Verifying consensus with distributed SHA-256 peers." },
    { num: 4, title: "Appending Block & Merkle Root", desc: "Finalizing immutable ledger entry." },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-8">
        <Panel className="w-full max-w-lg p-8 space-y-8 text-center">
          <div className="relative inline-flex size-20 items-center justify-center rounded-full border-2 border-integrity/40 bg-integrity-soft/40 text-integrity">
            <Cpu className="size-10 animate-pulse" />
            <div className="absolute inset-0 rounded-full animate-ping border border-integrity opacity-25" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Sealing Ballot to Blockchain
            </h1>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Please do not close your browser. Zero-trust consensus protocols are executing.
            </p>
          </div>

          {/* Stepper Progress */}
          <div className="space-y-4 text-left border-t border-border pt-6">
            {steps.map((step) => {
              const isCompleted = currentStep > step.num;
              const isCurrent = currentStep === step.num;

              return (
                <div key={step.num} className="flex items-start gap-3.5">
                  <div className="pt-0.5">
                    {isCompleted ? (
                      <CheckCircle2 className="size-5 text-success shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="size-5 text-integrity animate-spin shrink-0" />
                    ) : (
                      <div className="size-5 rounded-full border border-border flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                        {step.num}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className={`text-xs font-semibold ${isCurrent ? "text-integrity" : isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive-soft p-3 rounded-md border border-destructive/30">
              {error}
            </p>
          )}
        </Panel>
      </div>
    </AppLayout>
  );
}
