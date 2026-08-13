import { Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconGlyph, isLucideToken } from "@/components/gs/icon-glyph";

/**
 * Single source of truth for rendering a project's personalization icon.
 *
 * Supported stored values (unchanged, existing data keeps working):
 *   - literal emoji, e.g. "🎮"
 *   - built-in icon token, e.g. "lucide:Gamepad2"
 *   - an image URL / data URL for uploaded custom icons
 *
 * The container is a fixed square with a lavender surface so cards never shift
 * because one emoji happens to be wider or taller than another.
 */

const SIZES = {
  sm: { box: "size-6 rounded-[7px]", emoji: "text-[14px]", glyph: "size-3.5", pad: "p-[3px]" },
  md: { box: "size-9 rounded-[10px]", emoji: "text-[21px]", glyph: "size-[18px]", pad: "p-[3px]" },
  lg: { box: "size-12 rounded-[13px]", emoji: "text-[28px]", glyph: "size-6", pad: "p-1" },
} as const;

export type ProjectIconSize = keyof typeof SIZES;

function isImageValue(value: string): boolean {
  return /^(https?:\/\/|data:image\/|\/)/.test(value);
}

export function ProjectIcon({
  icon,
  name,
  size = "md",
  className,
  decorative = true,
}: {
  icon?: string | null | undefined;
  /** Project name — used for the accessible label when the icon is meaningful. */
  name?: string | undefined;
  size?: ProjectIconSize | undefined;
  className?: string | undefined;
  /** Decorative by default: the project name is always shown alongside. */
  decorative?: boolean | undefined;
}) {
  const s = SIZES[size];
  const label = decorative ? undefined : name ? `${name} icon` : "Project icon";

  let content: React.ReactNode;
  if (!icon) {
    content = <Gamepad2 className={cn(s.glyph, "shrink-0")} aria-hidden />;
  } else if (isLucideToken(icon)) {
    content = <IconGlyph value={icon} className={cn(s.glyph, "shrink-0")} />;
  } else if (isImageValue(icon)) {
    content = (
      <img
        src={icon}
        alt=""
        aria-hidden
        className={cn("size-full object-contain", s.pad)}
        loading="lazy"
      />
    );
  } else {
    content = (
      <span
        aria-hidden
        className={cn(
          "block font-normal not-italic tracking-normal antialiased",
          s.emoji,
        )}
        style={{ lineHeight: 1, fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif' }}
      >
        {icon}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 select-none items-center justify-center overflow-hidden border border-primary/10 bg-primary-soft text-primary leading-none",
        s.box,
        className,
      )}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {content}
    </span>
  );
}
