import { cn } from "@/lib/utils";
import {
  Sparkles,
  Pencil,
  CheckCircle2,
  FileText,
  XCircle,
  AlertTriangle,
  User,
  UserCircle2,
} from "lucide-react";
import type {
  FeatureStatus,
  Priority,
  BoardStatus,
  ContentSource,
  WorkflowStatus,
} from "@/lib/gamesprint";
import {
  BOARD_STATUS_COLORS,
  BOARD_STATUS_LABELS,
  WORKFLOW_STATUS_LABELS,
  contentMeta,
  workflowStatus,
} from "@/lib/gamesprint";


type ToneProps = { className?: string | undefined };

const base =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none";

const workflowMap: Record<
  WorkflowStatus,
  { classes: string; Icon: typeof Sparkles }
> = {
  DRAFT: { classes: "border-border-strong bg-muted text-muted-foreground", Icon: FileText },
  APPROVED: { classes: "border-success/30 bg-success-soft text-success", Icon: CheckCircle2 },
  REJECTED: { classes: "border-destructive/30 bg-destructive-soft text-destructive", Icon: XCircle },
};

/** Primary workflow status only: Draft, Approved or Rejected. */
export function WorkflowStatusBadge({
  status,
  className,
}: { status: WorkflowStatus } & ToneProps) {
  const entry = workflowMap[status];
  return (
    <span className={cn(base, entry.classes, className)}>
      <entry.Icon className="size-3.5" aria-hidden />
      {WORKFLOW_STATUS_LABELS[status]}
    </span>
  );
}

/** Secondary content metadata: AI Generated vs User Edited. Renders nothing for a raw draft. */
export function ContentMetaBadge({
  status,
  className,
}: { status: FeatureStatus } & ToneProps) {
  const meta = contentMeta(status);
  if (!meta) return null;
  const entry =
    meta === "AI_GENERATED"
      ? { label: "AI Generated", classes: "border-primary/30 bg-primary-soft text-primary", Icon: Sparkles }
      : { label: "User Edited", classes: "border-warning/30 bg-warning-soft text-warning", Icon: Pencil };
  return (
    <span className={cn(base, entry.classes, className)}>
      <entry.Icon className="size-3.5" aria-hidden />
      {entry.label}
    </span>
  );
}

/** Convenience: workflow badge plus the content metadata badge. */
export function FeatureStatusBadge({
  status,
  className,
}: { status: FeatureStatus } & ToneProps) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <WorkflowStatusBadge status={workflowStatus(status)} className={className} />
      <ContentMetaBadge status={status} />
    </span>
  );
}

export function AssigneeBadge({
  name,
  className,
}: { name: string | null } & ToneProps) {
  return (
    <span
      className={cn(
        base,
        name
          ? "border-dev/30 bg-dev-soft text-dev"
          : "border-border-strong bg-muted text-muted-foreground",
        className,
      )}
    >
      <UserCircle2 className="size-3.5" aria-hidden />
      {name ?? "Unassigned"}
    </span>
  );
}

export function NeedsReviewBadge({ className }: ToneProps) {
  return (
    <span className={cn(base, "border-warning/30 bg-warning-soft text-warning", className)}>
      <AlertTriangle className="size-3.5" aria-hidden />
      Needs Review
    </span>
  );
}


export function SourceBadge({ source, className }: { source: ContentSource } & ToneProps) {
  const map: Record<ContentSource, { label: string; classes: string; Icon: typeof Sparkles }> = {
    AI: { label: "AI Generated", classes: "border-primary/30 bg-primary-soft text-primary", Icon: Sparkles },
    USER_EDITED: {
      label: "Edited",
      classes: "border-warning/30 bg-warning-soft text-warning",
      Icon: Pencil,
    },
    USER_CREATED: {
      label: "User Created",
      classes: "border-border-strong bg-muted text-body",
      Icon: User,
    },
  };
  const entry = map[source];
  return (
    <span className={cn(base, entry.classes, className)}>
      <entry.Icon className="size-3 shrink-0" aria-hidden />
      {entry.label}
    </span>
  );
}

export function PriorityBadge({
  priority,
  recommendation,
  className,
}: { priority: Priority; recommendation?: boolean } & ToneProps) {
  const map: Record<Priority, string> = {
    LOW: "border-border-strong bg-muted text-muted-foreground",
    MEDIUM: "border-dev/30 bg-dev-soft text-dev",
    HIGH: "border-warning/30 bg-warning-soft text-warning",
    CRITICAL: "border-destructive/30 bg-destructive-soft text-destructive",
  };
  return (
    <span className={cn(base, map[priority], className)}>
      {recommendation ? "Recommended: " : ""}
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}

export function PointsBadge({ points, className }: { points: number | null } & ToneProps) {
  return (
    <span className={cn(base, "border-dev/30 bg-dev-soft text-dev", className)}>
      {points ?? "—"} pts
    </span>
  );
}

export function BoardStatusBadge({ status, className }: { status: BoardStatus } & ToneProps) {
  const tone = BOARD_STATUS_COLORS[status];
  return (
    <span className={cn(base, tone.badge, className)}>
      <span className={cn("size-2 rounded-full", tone.dot)} aria-hidden />
      {BOARD_STATUS_LABELS[status]}
    </span>
  );
}

