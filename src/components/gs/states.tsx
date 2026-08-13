import type { ReactNode } from "react";
import { Loader2, Inbox, TriangleAlert, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoadingState({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-2 p-8 text-sm text-muted-foreground", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}…
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
        {icon ?? <Inbox className="size-5" aria-hidden />}
      </div>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {description ? (
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  const denied = message?.includes("FORBIDDEN");
  return (
    <div
      className="surface-card flex flex-col items-start gap-3 border-destructive/30 bg-destructive-soft p-6"
      role="alert"
    >
      <div className="flex items-center gap-2 font-semibold text-destructive">
        {denied ? <ShieldOff className="size-4" aria-hidden /> : <TriangleAlert className="size-4" aria-hidden />}
        {denied ? "Permission denied" : title}
      </div>
      {message ? (
        <p className="text-sm text-body">{message.replace("FORBIDDEN: ", "")}</p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function SectionCard({
  title,
  hint,
  actions,
  children,
  icon,
}: {
  title: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section className="surface-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            {icon}
            {title}
          </h2>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
