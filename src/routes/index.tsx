import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Lock,
  Vote,
  Users,
  Blocks,
  ArrowRight,
  UserCheck,
  Building2,
  CheckCircle2,
  Cpu,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/app/surfaces";
import { ElectionStatusBadge } from "@/components/app/status-badge";
import { HashDisplay } from "@/components/app/hash-display";
import { AppHeader } from "@/components/app/app-header";
import { electionService, blockchainService, authService } from "@/services";
import { sessionStore } from "@/lib/session";
import type { Election, Block } from "@/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SecureVote Trust — Verifiable Cryptographic Voting Platform" },
      {
        name: "description",
        content:
          "Institutional zero-trust voting platform with biometric face liveness authentication and SHA-256 blockchain verification.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const [elections, setElections] = useState<Election[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [chainStats, setChainStats] = useState<{ total: number; verified: number; latest: number; integrity: "verified" | "compromised" }>({
    total: 0,
    verified: 0,
    latest: 0,
    integrity: "verified",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [elecList, blockList, stats] = await Promise.all([
          electionService.list(),
          blockchainService.listBlocks(),
          blockchainService.stats(),
        ]);
        setElections(elecList);
        setBlocks(blockList.slice(0, 3));
        setChainStats(stats);
      } catch (err) {
        console.error("Failed to load landing data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleDemoSignIn = async (role: "admin" | "voter") => {
    const user = await authService.signInDemo(role);
    sessionStore.set({ user });
    if (role === "admin") {
      navigate({ to: "/admin/dashboard" });
    } else {
      navigate({ to: "/voter/dashboard" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border bg-surface py-6 sm:py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-integrity/30 bg-integrity-soft px-3 py-0.5 text-xs font-semibold text-integrity">
                <ShieldCheck className="size-3.5" />
                <span>Zero-Trust Cryptographic Electoral Protocol</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Tamper-Proof Elections Built on Immutable Cryptographic Trust
              </h1>

              <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                SecureVote Trust unites <strong>biometric facial liveness verification</strong>,{" "}
                <strong>SHA-256 block ledger immutability</strong>, and <strong>Zero-Knowledge proof sealing</strong>{" "}
                to guarantee election integrity, complete voter privacy, and public auditability.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button size="lg" className="gap-2 shadow-raised" onClick={() => handleDemoSignIn("voter")}>
                  <UserCheck className="size-4" />
                  <span>Enter Voter Portal</span>
                </Button>

                <Button size="lg" variant="outline" className="gap-2" onClick={() => handleDemoSignIn("admin")}>
                  <Building2 className="size-4" />
                  <span>Admin Console</span>
                </Button>

                <Button variant="ghost" size="lg" asChild className="gap-1.5 text-xs text-muted-foreground">
                  <Link to="/register">Register New Voter Identity</Link>
                </Button>
              </div>

              {/* Integrity Metric Strip */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
                <div>
                  <p className="text-2xl font-bold numeric text-foreground">
                    {loading ? "..." : chainStats.verified}
                  </p>
                  <p className="text-xs text-muted-foreground">Blocks Verified</p>
                </div>
                <div>
                  <p className="text-2xl font-bold numeric text-integrity">100%</p>
                  <p className="text-xs text-muted-foreground">Signature Validity</p>
                </div>
                <div>
                  <p className="text-2xl font-bold numeric text-success">0ms</p>
                  <p className="text-xs text-muted-foreground">Tamper Detection Latency</p>
                </div>
              </div>
            </div>

            {/* Right Card Illustration */}
            <div className="lg:col-span-5">
              <Panel className="p-6 space-y-5 bg-gradient-to-b from-surface to-muted/30 border-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="size-5 text-integrity" />
                    <span className="font-semibold text-sm">Ledger Node Status</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                    <span className="size-2 rounded-full bg-success animate-ping" />
                    Operational
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border border-border bg-surface p-3 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Merkle Root Digest</span>
                      <span className="font-mono text-integrity">Verified</span>
                    </div>
                    <HashDisplay value="0x7f9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a" className="w-full text-xs" />
                  </div>

                  <div className="rounded-lg border border-border bg-surface p-3 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Latest Block Height</span>
                      <span className="font-mono font-semibold text-foreground">#7</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Nonce: <span className="font-mono text-foreground">1948201</span> | 5 Transactions
                    </p>
                  </div>
                </div>

                <div className="rounded-md bg-integrity-soft/50 p-3 text-xs text-integrity flex items-start gap-2">
                  <Sparkles className="size-4 shrink-0 mt-0.5" />
                  <span>
                    Zero-Knowledge ballot sealing encrypts candidate choice before broadcasting to ledger nodes.
                  </span>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Pillars Section */}
      <section className="py-16 bg-background border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Architected for Absolute Verification
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Built on institutional cryptography to solve voter impersonation, vote buying, and centralized database tampering.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Panel className="p-5 space-y-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Lock className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Zero-Trust Security</h3>
              <p className="text-xs text-muted-foreground">
                No single server or administrator holds ballot keys. Every vote is signed with voter ZK proof.
              </p>
            </Panel>

            <Panel className="p-5 space-y-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-integrity-soft text-integrity">
                <UserCheck className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Biometric Liveness</h3>
              <p className="text-xs text-muted-foreground">
                Real-time facial geometry extraction prevents spoofing, deepfakes, and duplicate voter registration.
              </p>
            </Panel>

            <Panel className="p-5 space-y-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-success-soft text-success">
                <Blocks className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">SHA-256 Immutability</h3>
              <p className="text-xs text-muted-foreground">
                Cryptographic block chaining prevents retroactive altering of election tallies.
              </p>
            </Panel>

            <Panel className="p-5 space-y-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-warning-soft text-warning">
                <CheckCircle2 className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">End-to-End Verifiable</h3>
              <p className="text-xs text-muted-foreground">
                Every voter receives a cryptographic transaction receipt to independently audit their ballot.
              </p>
            </Panel>
          </div>
        </div>
      </section>

      {/* Active Elections Feed */}
      <section className="py-16 bg-surface border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Active & Scheduled Elections</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time status of institutional elections registered on the zero-trust network.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleDemoSignIn("voter")} className="gap-1.5 text-xs">
              <span>View All Elections</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {elections.slice(0, 3).map((elec) => (
              <Panel key={elec.id} className="p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <ElectionStatusBadge status={elec.status} />
                    <span className="text-xs font-mono text-muted-foreground">{elec.votesCast} Votes</span>
                  </div>
                  <h3 className="font-semibold text-base text-foreground leading-snug">{elec.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{elec.description}</p>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">
                    <span>Registered Voters: </span>
                    <strong className="text-foreground">{elec.registeredVoters}</strong>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDemoSignIn("voter")} className="text-xs gap-1">
                    <span>Vote Now</span>
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      {/* Blockchain Ledger Snippet */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Latest Blockchain Blocks</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Public cryptographic ledger entries storing sealed ballot hashes.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleDemoSignIn("admin")} className="gap-1.5 text-xs">
              <Blocks className="size-3.5" />
              <span>Inspect Full Ledger</span>
            </Button>
          </div>

          <div className="space-y-3">
            {blocks.map((block) => (
              <Panel key={block.index} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-muted text-xs font-bold font-mono text-foreground">
                    #{block.index}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">Block #{block.index}</span>
                      {block.verified && (
                        <span className="rounded bg-success-soft px-1.5 py-0.2 text-[10px] font-semibold text-success">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {block.transactionCount} Sealed Ballot Transactions | {new Date(block.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden md:flex flex-col text-right">
                    <span className="text-[10px] text-muted-foreground uppercase">Block Hash</span>
                    <HashDisplay value={block.hash} truncate />
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-surface py-8">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 md:px-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="size-5 text-primary" />
            <span className="font-semibold tracking-tight text-foreground">SecureVote Trust</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Zero-Trust Biometric & Blockchain Electoral Protocol © {new Date().getFullYear()} SecureVote Trust Foundation.
          </p>
        </div>
      </footer>
    </div>
  );
}
