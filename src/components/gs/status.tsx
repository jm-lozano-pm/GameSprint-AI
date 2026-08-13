import { cn } from "@/lib/utils";
import { BOARD_STATUS_COLORS, BOARD_STATUS_LABELS, type BoardStatus } from "@/lib/gamesprint";

/** Small coloured dot for an execution status. Same colour on every page. */
export function StatusDot({ status, className }: { status: BoardStatus; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", BOARD_STATUS_COLORS[status].dot, className)}
    />
  );
}

/** Column / group header: ● LABEL ........ count, all tinted with the status colour. */
export function StatusHeader({
  status,
  count,
  id,
  className,
}: {
  status: BoardStatus;
  count: number;
  id?: string;
  className?: string;
}) {
  const tone = BOARD_STATUS_COLORS[status];
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <h2
        id={id}
        className={cn(
          "flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase",
          tone.text,
        )}
      >
        <StatusDot status={status} />
        {BOARD_STATUS_LABELS[status]}
      </h2>
      <span
        className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none", tone.count)}
      >
        {count}
      </span>
    </div>
  );
}
