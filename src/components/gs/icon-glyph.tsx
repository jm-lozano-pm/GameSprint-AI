import {
  Gamepad2,
  Sword,
  Shield,
  Wand2,
  Ghost,
  Rocket,
  Palette,
  Brush,
  Code2,
  Cpu,
  Bug,
  Music,
  Headphones,
  Box,
  Boxes,
  Camera,
  Film,
  Map,
  Compass,
  Target,
  Trophy,
  Flame,
  Sparkles,
  Star,
  Heart,
  Zap,
  Wrench,
  Hammer,
  PenTool,
  Layers,
  Lightbulb,
  BookOpen,
  Users,
  Briefcase,
  Megaphone,
  LineChart,
  Coins,
  Globe,
  Skull,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Personalization icons are stored as ONE short text value, never merged into
 * the name. Two shapes are supported:
 *   - a literal emoji, e.g. "🎮"
 *   - a built-in icon token, e.g. "lucide:Gamepad2"
 */
export const LUCIDE_ICONS = {
  Gamepad2: { Icon: Gamepad2, label: "Game controller" },
  Sword: { Icon: Sword, label: "Sword" },
  Shield: { Icon: Shield, label: "Shield" },
  Wand2: { Icon: Wand2, label: "Magic wand" },
  Ghost: { Icon: Ghost, label: "Ghost" },
  Rocket: { Icon: Rocket, label: "Rocket" },
  Palette: { Icon: Palette, label: "Artist palette" },
  Brush: { Icon: Brush, label: "Paint brush" },
  Code2: { Icon: Code2, label: "Code" },
  Cpu: { Icon: Cpu, label: "Processor" },
  Bug: { Icon: Bug, label: "Bug" },
  Music: { Icon: Music, label: "Music note" },
  Headphones: { Icon: Headphones, label: "Headphones" },
  Box: { Icon: Box, label: "Box" },
  Boxes: { Icon: Boxes, label: "3D boxes" },
  Camera: { Icon: Camera, label: "Camera" },
  Film: { Icon: Film, label: "Film" },
  Map: { Icon: Map, label: "Map" },
  Compass: { Icon: Compass, label: "Compass" },
  Target: { Icon: Target, label: "Target" },
  Trophy: { Icon: Trophy, label: "Trophy" },
  Flame: { Icon: Flame, label: "Flame" },
  Sparkles: { Icon: Sparkles, label: "Sparkles" },
  Star: { Icon: Star, label: "Star" },
  Heart: { Icon: Heart, label: "Heart" },
  Zap: { Icon: Zap, label: "Lightning bolt" },
  Wrench: { Icon: Wrench, label: "Wrench" },
  Hammer: { Icon: Hammer, label: "Hammer" },
  PenTool: { Icon: PenTool, label: "Pen tool" },
  Layers: { Icon: Layers, label: "Layers" },
  Lightbulb: { Icon: Lightbulb, label: "Lightbulb" },
  BookOpen: { Icon: BookOpen, label: "Open book" },
  Users: { Icon: Users, label: "People" },
  Briefcase: { Icon: Briefcase, label: "Briefcase" },
  Megaphone: { Icon: Megaphone, label: "Megaphone" },
  LineChart: { Icon: LineChart, label: "Chart" },
  Coins: { Icon: Coins, label: "Coins" },
  Globe: { Icon: Globe, label: "Globe" },
  Skull: { Icon: Skull, label: "Skull" },
  Crown: { Icon: Crown, label: "Crown" },
} as const;

export type LucideIconName = keyof typeof LUCIDE_ICONS;

export const LUCIDE_PREFIX = "lucide:";

export function isLucideToken(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(LUCIDE_PREFIX));
}

export function iconLabel(value: string | null | undefined): string {
  if (!value) return "";
  if (isLucideToken(value)) {
    const key = value.slice(LUCIDE_PREFIX.length) as LucideIconName;
    return LUCIDE_ICONS[key]?.label ?? "Icon";
  }
  return value;
}

/** Renders a stored personalization icon. Renders nothing when there is none. */
export function IconGlyph({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string | undefined;
}) {
  if (!value) return null;
  if (isLucideToken(value)) {
    const key = value.slice(LUCIDE_PREFIX.length) as LucideIconName;
    const entry = LUCIDE_ICONS[key];
    if (!entry) return null;
    return (
      <entry.Icon
        className={cn("size-4 shrink-0", className)}
        role="img"
        aria-label={entry.label}
      />
    );
  }
  return (
    <span className={cn("shrink-0 leading-none", className)} role="img" aria-label={value}>
      {value}
    </span>
  );
}

/** Icon (when present) plus text, e.g. “🎨 Artist”. */
export function IconLabel({
  icon,
  children,
  className,
  iconClassName,
}: {
  icon: string | null | undefined;
  children: React.ReactNode;
  className?: string | undefined;
  iconClassName?: string | undefined;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <IconGlyph value={icon} className={iconClassName} />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

/**
 * Plain-text rendering of an icon + name, used where only a string fits
 * (e.g. compact chips). Built-in icon tokens are omitted rather than leaked.
 */
export function iconTextLabel(
  entry: { name: string; icon?: string | null | undefined } | null | undefined,
): string {
  if (!entry) return "";
  if (!entry.icon || isLucideToken(entry.icon)) return entry.name;
  return `${entry.icon} ${entry.name}`;
}
