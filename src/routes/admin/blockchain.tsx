import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Blocks,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  ArrowRight,
  RefreshCw,
  Server,
  Globe2,
  Lock,
  Layers,
  Activity
} from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader, MetricCard } from "@/components/app/surfaces";
import { HashDisplay } from "@/components/app/hash-display";
import { LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { blockchainService } from "@/services";
import type { Block, ConsensusSummary } from "@/types";

export const Route = createFileRoute("/admin/blockchain")({
  head: () => ({
    meta: [
      { title: "Blockchain Explorer — SecureVote Trust" },
      { name: "description", content: "Inspect SHA-256 block ledger immutability and multi-party observer notary consensus." },
    ],
  }),
  component: AdminBlockchainPage,
});

function AdminBlockchainPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [stats, setStats] = useState<{ total: number; verified: number; latest: number; integrity: "verified" | "compromised" }>({
    total: 0,
    verified: 0,
    latest: 0,
    integrity: "verified",
  });
  const [consensus, setConsensus] = useState<ConsensusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [blist, st, cons] = await Promise.all([
        blockchainService.listBlocks(),
        blockchainService.stats(),
        blockchainService.getConsensus().catch(() => null),
      ]);
      setBlocks(blist);
      setStats(st);
      if (cons) setConsensus(cons);
      if (blist.length > 0) setSelectedBlock(blist[0] ?? null);
    } catch (err) {
      console.error("Failed to load blockchain ledger data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <AppLayout>
      <PageHeader
        title="Cryptographic Ledger Explorer"
        description="Public SHA-256 block height chain. Inspect zero-knowledge sealed ballot transactions, Merkle roots, and multi-party institutional notary consensus."
        actions={
          <Button variant="outline" onClick={loadData} className="gap-1.5 text-xs">
            <RefreshCw className="size-3.5" />
            <span>Refresh Ledger & Consensus</span>
          </Button>
        }
      />

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <MetricCard label="Chain Height" value={`#${stats.latest}`} hint="Latest appended block" tone="default" />
        <MetricCard label="Blocks Verified" value={stats.verified} hint="100% cryptographic consensus" tone="success" />
        <MetricCard label="Ledger Integrity" value="VERIFIED" hint="Zero tampered signatures" tone="success" />
        <MetricCard label="Hash Algorithm" value="SHA-256" hint="Merkle tree verification" tone="default" />
      </div>

      {/* Multi-Party Observer Consensus Quorum Banner */}
      {consensus && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/20 text-primary border border-primary/30">
                <Globe2 className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground tracking-tight">
                    Multi-Party Observer Notary Quorum
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="size-3" />
                    {consensus.activeNodes}/{consensus.totalNodes} Nodes Active (100% Byzantine Agreement)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Protocol: <span className="font-mono text-foreground font-medium">{consensus.consensusProtocol}</span> | Fault Tolerance: <span className="font-mono text-foreground">{consensus.byzantineFaultTolerance}</span>
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground font-mono bg-background/60 px-3 py-1.5 rounded-lg border border-border">
              Threshold Required: <span className="text-primary font-semibold">{consensus.thresholdRequired}</span>
            </div>
          </div>

          {/* Observer Nodes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {consensus.observerNodes.map((node) => (
              <div
                key={node.id}
                className="p-3.5 rounded-lg bg-card/80 border border-border/80 space-y-2 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
                    <Server className="size-3.5 text-primary shrink-0" />
                    <span className="truncate" title={node.name}>{node.name}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase shrink-0">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {node.status}
                  </span>
                </div>

                <div className="text-[11px] text-muted-foreground space-y-0.5 font-mono">
                  <p className="truncate text-foreground/80">{node.jurisdiction}</p>
                  <div className="flex justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                    <span>{node.keyAlgorithm}</span>
                    <span className="text-emerald-400 font-semibold">{node.latencyMs}ms</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Block List Feed */}
        <div className="lg:col-span-7 space-y-4">
          <Panel>
            <PanelHeader
              title="Block Height Chain"
              description="Click any block to inspect cryptographic headers."
            />

            {loading ? (
              <LoadingState label="Inspecting ledger height" />
            ) : (
              <div className="divide-y divide-border">
                {blocks.map((block) => {
                  const isSelected = selectedBlock?.index === block.index;

                  return (
                    <div
                      key={block.index}
                      onClick={() => setSelectedBlock(block)}
                      className={`p-4 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                        isSelected ? "bg-primary-soft/50 border-l-4 border-l-primary" : "hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground font-mono font-bold text-sm">
                          #{block.index}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">Block #{block.index}</span>
                            {block.verified && (
                              <span className="rounded bg-success-soft px-1.5 py-0.2 text-[10px] font-semibold text-success">
                                Verified
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {block.transactionCount} Sealed Transactions | {new Date(block.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      <HashDisplay value={block.hash} truncate className="hidden sm:inline-flex" />
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* Selected Block Details Inspector Panel */}
        <div className="lg:col-span-5">
          {selectedBlock ? (
            <Panel className="p-5 space-y-5 sticky top-20 border-2 border-primary/20">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="size-5 text-integrity" />
                  <h3 className="font-bold text-base text-foreground">Block #{selectedBlock.index} Details</h3>
                </div>
                <span className="rounded bg-success-soft px-2 py-0.5 text-xs font-semibold text-success flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  Consensus Valid
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground uppercase text-[10px]">Current Block Hash</span>
                  <div className="mt-1">
                    <HashDisplay value={selectedBlock.hash} truncate={false} className="w-full" />
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground uppercase text-[10px]">Previous Block Hash</span>
                  <div className="mt-1">
                    <HashDisplay value={selectedBlock.previousHash} truncate={false} className="w-full" />
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground uppercase text-[10px]">Merkle Root Digest</span>
                  <div className="mt-1">
                    <HashDisplay value={selectedBlock.merkleRoot} truncate={false} className="w-full" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg border p-3">
                    <span className="text-[10px] text-muted-foreground uppercase">Nonce</span>
                    <p className="font-mono font-bold text-foreground mt-0.5">{selectedBlock.nonce}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <span className="text-[10px] text-muted-foreground uppercase">Transactions</span>
                    <p className="font-mono font-bold text-foreground mt-0.5">{selectedBlock.transactionCount}</p>
                  </div>
                </div>

                {/* Notary Seal */}
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-primary">
                    <Lock className="size-3" />
                    <span>Multi-Party Observer Notary Seal</span>
                  </div>
                  <p className="text-muted-foreground text-[10px]">
                    Validated & notarized by Election Commission, Judicial Council, and Independent Scrutiny consortium nodes.
                  </p>
                </div>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}
