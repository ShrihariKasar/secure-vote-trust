import { useState } from "react";
import { Search, UserCheck, CheckCircle2, Clock, XCircle, ShieldCheck, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApprovalBadge, VotingStatusBadge } from "@/components/app/status-badge";
import { voterService } from "@/services";
import type { Voter } from "@/types";
import { useNavigate } from "@tanstack/react-router";

interface VoterStatusDialogProps {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

export function VoterStatusDialog({ trigger, defaultOpen = false }: VoterStatusDialogProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const [voter, setVoter] = useState<Voter | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);
    setVoter(null);

    try {
      const res = await voterService.get(query.trim());
      if (res) {
        setVoter(res);
      } else {
        setError("No voter registration record found for this Voter ID or email address.");
      }
    } catch (err: any) {
      console.error(err);
      setError("No voter registration record found matching your query.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setQuery("");
    setVoter(null);
    setSearched(false);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) handleReset(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <UserCheck className="size-3.5 text-primary" />
            <span>Check Registration Status</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="size-5" />
            <DialogTitle className="text-base font-bold">Voter Registration Acceptance Status</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Enter your National Voter ID, Student ID, or registered email address to check application acceptance status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSearch} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="search-query" className="text-xs">Voter ID or Registered Email</Label>
            <div className="flex gap-2">
              <Input
                id="search-query"
                placeholder="e.g. VTR-99201 or aris.thorne@university.edu"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="text-xs"
                required
              />
              <Button type="submit" size="sm" disabled={loading} className="gap-1.5 shrink-0 shadow-raised">
                {loading ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <Search className="size-3.5" />
                )}
                <span>Check</span>
              </Button>
            </div>
          </div>
        </form>

        {error && searched && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive-soft p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {voter && (
          <div className="mt-2 space-y-4 rounded-xl border border-border bg-card/80 p-4 text-xs backdrop-blur-sm">
            {/* Header Result Status */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h4 className="font-semibold text-sm text-foreground">{voter.name}</h4>
                <p className="font-mono text-[11px] text-muted-foreground">ID: {voter.id}</p>
              </div>
              <ApprovalBadge status={voter.approval} />
            </div>

            {/* Application Feedback Banner */}
            {voter.approval === "approved" && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>Registration Approved & Active</span>
                </div>
                <p className="text-[11px] text-emerald-300/80">
                  Your identity and 256-bit facial vector hash have been verified by the election board. You may now cast your ballot in active elections.
                </p>
                <Button
                  size="sm"
                  onClick={() => { setOpen(false); navigate({ to: "/login" }); }}
                  className="w-full gap-1.5 mt-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-raised text-xs"
                >
                  <span>Sign In & Vote Now</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            )}

            {voter.approval === "pending" && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-400 space-y-1.5">
                <div className="flex items-center gap-2 font-medium">
                  <Clock className="size-4 shrink-0" />
                  <span>Pending Committee Review</span>
                </div>
                <p className="text-[11px] text-amber-300/80">
                  Your registration payload and facial biometrics are queued in the administrator review queue. Status will update automatically once verified.
                </p>
              </div>
            )}

            {voter.approval === "rejected" && (
              <div className="rounded-lg border border-destructive/30 bg-destructive-soft p-3 text-destructive space-y-1.5">
                <div className="flex items-center gap-2 font-medium">
                  <XCircle className="size-4 shrink-0" />
                  <span>Registration Declined</span>
                </div>
                <p className="text-[11px] text-destructive/80">
                  Your registration application was declined by administrators. Please review your submitted credentials or contact electoral support.
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="rounded-md border border-border/40 bg-muted/20 p-2">
                <span className="text-muted-foreground block text-[10px] uppercase">Registered Email</span>
                <span className="font-semibold text-foreground truncate block">{voter.email}</span>
              </div>
              <div className="rounded-md border border-border/40 bg-muted/20 p-2">
                <span className="text-muted-foreground block text-[10px] uppercase">Biometric Hash</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="size-3" />
                  <span>Enrolled & Encrypted</span>
                </span>
              </div>
              <div className="rounded-md border border-border/40 bg-muted/20 p-2">
                <span className="text-muted-foreground block text-[10px] uppercase">Voting Status</span>
                <VotingStatusBadge status={voter.voting} />
              </div>
              <div className="rounded-md border border-border/40 bg-muted/20 p-2">
                <span className="text-muted-foreground block text-[10px] uppercase">Application Date</span>
                <span className="font-mono text-muted-foreground">{new Date(voter.registeredAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
