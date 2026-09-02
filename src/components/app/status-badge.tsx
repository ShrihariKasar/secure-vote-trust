import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ApprovalStatus, ElectionStatus, VotingStatus } from "@/types";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        info: "border-integrity/25 bg-integrity-soft text-integrity",
        success: "border-success/25 bg-success-soft text-success",
        warning: "border-warning/30 bg-warning-soft text-warning",
        danger: "border-destructive/25 bg-destructive-soft text-destructive",
        brand: "border-primary/20 bg-primary-soft text-primary",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badge>["tone"]>;

export function StatusBadge({
  tone = "neutral",
  children,
  dot = true,
  className,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={cn(badge({ tone }), className)}>
      {dot ? <span aria-hidden className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

const electionLabels: Record<ElectionStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  scheduled: { label: "Scheduled", tone: "info" },
  voting_open: { label: "Voting open", tone: "success" },
  voting_closed: { label: "Voting closed", tone: "warning" },
  results_published: { label: "Results published", tone: "brand" },
};

export const ElectionStatusBadge = ({ status }: { status: ElectionStatus }) => (
  <StatusBadge tone={electionLabels[status].tone}>{electionLabels[status].label}</StatusBadge>
);

const approvalLabels: Record<ApprovalStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  suspended: { label: "Suspended", tone: "neutral" },
};

export const ApprovalBadge = ({ status }: { status: ApprovalStatus }) => (
  <StatusBadge tone={approvalLabels[status].tone}>{approvalLabels[status].label}</StatusBadge>
);

export const VotingStatusBadge = ({ status }: { status: VotingStatus }) => (
  <StatusBadge tone={status === "vote_recorded" ? "success" : "neutral"}>
    {status === "vote_recorded" ? "Vote recorded" : "Not voted"}
  </StatusBadge>
);
