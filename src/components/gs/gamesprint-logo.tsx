import { cn } from "@/lib/utils";
import fullAsset from "@/assets/gs-logo-full.png.asset.json";
import symbolAsset from "@/assets/gs-logo-symbol.png.asset.json";
import whiteAsset from "@/assets/gs-logo-white.png.asset.json";
import whiteSymbolAsset from "@/assets/gs-logo-white-symbol.png.asset.json";
import monoAsset from "@/assets/gs-logo-mono.png.asset.json";
import monoSymbolAsset from "@/assets/gs-logo-mono-symbol.png.asset.json";

/**
 * Official GameSprint AI brand mark.
 * Variants map 1:1 to the approved brand sheet. Never recolor, stretch or rotate.
 */
export type GameSprintLogoVariant =
  | "full"
  | "symbol"
  | "white"
  | "white-symbol"
  | "monochrome"
  | "monochrome-symbol";

const SOURCES: Record<GameSprintLogoVariant, { url: string; w: number; h: number }> = {
  full: { url: fullAsset.url, w: 2640, h: 684 },
  symbol: { url: symbolAsset.url, w: 423, h: 345 },
  white: { url: whiteAsset.url, w: 1293, h: 342 },
  "white-symbol": { url: whiteSymbolAsset.url, w: 384, h: 285 },
  monochrome: { url: monoAsset.url, w: 492, h: 390 },
  "monochrome-symbol": { url: monoSymbolAsset.url, w: 387, h: 285 },
};

export function GameSprintLogo({
  variant = "full",
  height,
  className,
  alt = "GameSprint AI",
  decorative = false,
}: {
  variant?: GameSprintLogoVariant;
  /** Rendered height in px; width follows the official aspect ratio. */
  height?: number;
  className?: string;
  alt?: string;
  decorative?: boolean;
}) {
  const src = SOURCES[variant];
  const h = height ?? (variant.includes("symbol") ? 32 : 28);
  const w = Math.round((src.w / src.h) * h);

  return (
    <img
      src={src.url}
      width={w}
      height={h}
      style={{ height: h, width: w }}
      className={cn("select-none object-contain", className)}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      draggable={false}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * Lockup that switches to the white variant on dark backgrounds automatically.
 */
export function GameSprintLockup({
  height = 28,
  symbol = false,
  className,
  alt = "GameSprint AI",
}: {
  height?: number;
  symbol?: boolean;
  className?: string;
  alt?: string;
}) {
  return (
    <>
      <GameSprintLogo
        variant={symbol ? "symbol" : "full"}
        height={height}
        alt={alt}
        className={cn("dark:hidden", className)}
      />
      <GameSprintLogo
        variant={symbol ? "white-symbol" : "white"}
        height={height}
        alt={alt}
        decorative
        className={cn("hidden dark:block", className)}
      />
    </>
  );
}
