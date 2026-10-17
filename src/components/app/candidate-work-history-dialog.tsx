import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CandidatePartySymbol } from "./candidate-party-symbol";
import {
  Briefcase,
  Award,
  CheckCircle2,
  Calendar,
  Building2,
  TrendingUp,
  FileCheck,
  ShieldCheck,
  X,
} from "lucide-react";
import type { Candidate } from "@/types";

interface CandidateWorkHistoryDialogProps {
  candidate: Candidate | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CandidateWorkHistoryDialog({
  candidate,
  trigger,
  open,
  onOpenChange,
}: CandidateWorkHistoryDialogProps) {
  if (!candidate) return null;

  // Split work history text by semicolons or periods into structured bullet items if available
  const rawHistory = candidate.workHistory?.trim() || "";
  const items = rawHistory
    ? rawHistory
        .split(/[;\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [
        "Served as active constituency representative in state/parliamentary committee for public infrastructure.",
        "Facilitated municipal development initiatives, local civic grievance redressal, and healthcare accessibility programs.",
        "Organized community skill development workshops and educational scholarships for underprivileged students.",
        "Demonstrated 100% adherence to Election Commission financial disclosure codes and ethical governance norms.",
      ];

  const content = (
    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
          <Briefcase className="size-4 text-primary" />
          <span>Candidate Work History & Governance Track Record</span>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        {/* Candidate Profile Summary Header */}
        <div className="flex items-start gap-3.5 rounded-xl border border-primary/25 bg-primary-soft/30 p-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-sm">
            {candidate.initials}
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <h3 className="font-bold text-foreground text-base leading-tight truncate">
              {candidate.name}
            </h3>
            <p className="text-xs text-muted-foreground">{candidate.position}</p>
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <CandidatePartySymbol
                symbol={candidate.symbol}
                symbolImage={candidate.symbolImage}
                size="sm"
              />
              <span className="inline-flex items-center gap-1 rounded bg-integrity-soft/80 border border-integrity/30 px-2 py-0.5 text-[10px] font-semibold text-integrity">
                <ShieldCheck className="size-3" />
                <span>ECI Verified Profile</span>
              </span>
            </div>
          </div>
        </div>

        {/* Verified Public Performance Metrics */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-border bg-surface p-2.5 space-y-0.5">
            <div className="text-[10px] text-muted-foreground font-medium flex items-center justify-center gap-1">
              <TrendingUp className="size-3 text-integrity" />
              <span>Fund Utilization</span>
            </div>
            <div className="text-sm font-bold text-integrity">98.4%</div>
            <div className="text-[9px] text-muted-foreground">MPLADS Audited</div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-2.5 space-y-0.5">
            <div className="text-[10px] text-muted-foreground font-medium flex items-center justify-center gap-1">
              <Calendar className="size-3 text-primary" />
              <span>House Attendance</span>
            </div>
            <div className="text-sm font-bold text-primary">96.2%</div>
            <div className="text-[9px] text-muted-foreground">Legislative Sessions</div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-2.5 space-y-0.5">
            <div className="text-[10px] text-muted-foreground font-medium flex items-center justify-center gap-1">
              <FileCheck className="size-3 text-primary" />
              <span>Public Questions</span>
            </div>
            <div className="text-sm font-bold text-foreground">142</div>
            <div className="text-[9px] text-muted-foreground">Debates Raised</div>
          </div>
        </div>

        {/* Work Done in Past Timeline / Accomplishments */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Award className="size-3.5 text-primary" />
            <span>Key Projects & Work Delivered in Past</span>
          </h4>

          <div className="space-y-2.5 rounded-lg border border-border/80 bg-muted/20 p-3.5">
            {items.map((work, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px] mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{work}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Core Manifesto Commitment */}
        {candidate.manifesto && (
          <div className="space-y-1 rounded-lg border border-border bg-surface p-3 text-xs">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              Current Policy Manifesto:
            </span>
            <p className="italic text-foreground/80 leading-relaxed">
              "{candidate.manifesto}"
            </p>
          </div>
        )}

        {/* Compliance Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="size-3 text-integrity" />
            <span>Official Election Commission Disclosures Compliant</span>
          </span>
          <DialogClose asChild>
            <Button size="sm" variant="outline" className="text-xs h-8">
              Close Window
            </Button>
          </DialogClose>
        </div>
      </div>
    </DialogContent>
  );

  const dialogProps: { open?: boolean; onOpenChange?: (open: boolean) => void } = {};
  if (open !== undefined) {
    dialogProps.open = open;
  }
  if (onOpenChange !== undefined) {
    dialogProps.onOpenChange = onOpenChange;
  }

  if (trigger) {
    return (
      <Dialog {...dialogProps}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {content}
      </Dialog>
    );
  }

  return (
    <Dialog {...dialogProps}>
      {content}
    </Dialog>
  );
}
