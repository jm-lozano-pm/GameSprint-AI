import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function userInitials(name: string | null | undefined): string {
  const source = (name ?? "").trim();
  if (!source) return "?";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/** Profile picture with an initials fallback — never a broken-image icon. */
export function UserAvatar({
  name,
  imageUrl,
  className,
  fallbackClassName,
}: {
  name: string | null | undefined;
  imageUrl?: string | null | undefined;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={cn("size-8", className)}>
      {imageUrl ? <AvatarImage src={imageUrl} alt="" /> : null}
      <AvatarFallback
        className={cn("bg-primary-soft text-[10px] font-semibold text-primary", fallbackClassName)}
      >
        {userInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Avatar + name (+ optional professional roles) used in assignment UI. */
export function UserChip({
  name,
  imageUrl,
  roles,
  className,
  compact,
}: {
  name: string | null | undefined;
  imageUrl?: string | null | undefined;
  roles?: string[] | undefined;
  className?: string;
  compact?: boolean;
}) {
  const roleLine = (roles ?? []).join(" · ");
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <UserAvatar name={name} imageUrl={imageUrl} className={compact ? "size-6" : "size-7"} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-xs font-medium">{name ?? "Unassigned"}</span>
        {roleLine ? (
          <span className="block truncate text-[11px] text-muted-foreground">{roleLine}</span>
        ) : null}
      </span>
    </span>
  );
}
