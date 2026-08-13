import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  IconGlyph,
  LUCIDE_ICONS,
  LUCIDE_PREFIX,
  type LucideIconName,
} from "@/components/gs/icon-glyph";

/**
 * ONE picker used everywhere personalization is offered: projects, project
 * descriptions, profile names and professional roles. Emoji first, built-in
 * icons second, recents remembered locally per browser.
 */

type EmojiEntry = { emoji: string; label: string };

const EMOJI: EmojiEntry[] = [
  { emoji: "🎮", label: "Game controller" },
  { emoji: "🕹️", label: "Joystick" },
  { emoji: "👾", label: "Alien monster" },
  { emoji: "⚔️", label: "Crossed swords" },
  { emoji: "🛡️", label: "Shield" },
  { emoji: "🏹", label: "Bow and arrow" },
  { emoji: "🪄", label: "Magic wand" },
  { emoji: "🧙", label: "Mage" },
  { emoji: "🧝", label: "Elf" },
  { emoji: "🐉", label: "Dragon" },
  { emoji: "💀", label: "Skull" },
  { emoji: "👻", label: "Ghost" },
  { emoji: "🤖", label: "Robot" },
  { emoji: "🚀", label: "Rocket" },
  { emoji: "🛸", label: "Flying saucer" },
  { emoji: "🌌", label: "Milky way" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "❄️", label: "Snowflake" },
  { emoji: "🧊", label: "Ice cube" },
  { emoji: "⚡", label: "Lightning bolt" },
  { emoji: "✨", label: "Sparkles" },
  { emoji: "🎨", label: "Artist palette" },
  { emoji: "🖌️", label: "Paint brush" },
  { emoji: "🖍️", label: "Crayon" },
  { emoji: "💻", label: "Laptop" },
  { emoji: "🧑‍💻", label: "Programmer" },
  { emoji: "🛠️", label: "Tools" },
  { emoji: "🔧", label: "Wrench" },
  { emoji: "🧩", label: "Puzzle piece" },
  { emoji: "🎯", label: "Bullseye" },
  { emoji: "🏆", label: "Trophy" },
  { emoji: "🥇", label: "Gold medal" },
  { emoji: "🎵", label: "Music note" },
  { emoji: "🎧", label: "Headphones" },
  { emoji: "🎬", label: "Clapper board" },
  { emoji: "📷", label: "Camera" },
  { emoji: "🗺️", label: "World map" },
  { emoji: "🧭", label: "Compass" },
  { emoji: "📚", label: "Books" },
  { emoji: "📝", label: "Notes" },
  { emoji: "💡", label: "Lightbulb" },
  { emoji: "🧠", label: "Brain" },
  { emoji: "👤", label: "Person" },
  { emoji: "👥", label: "People" },
  { emoji: "👑", label: "Crown" },
  { emoji: "💰", label: "Money bag" },
  { emoji: "📈", label: "Chart increasing" },
  { emoji: "🌍", label: "Globe" },
  { emoji: "🍄", label: "Mushroom" },
  { emoji: "🐺", label: "Wolf" },
  { emoji: "😀", label: "Grinning face" },
  { emoji: "😎", label: "Smiling face with sunglasses" },
];

const RECENT_KEY = "gs.icon-picker.recent";
const RECENT_LIMIT = 12;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function rememberRecent(value: string) {
  if (typeof window === "undefined") return;
  const next = [value, ...readRecent().filter((entry) => entry !== value)].slice(0, RECENT_LIMIT);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Recents are a convenience only.
  }
}

function labelFor(value: string): string {
  if (value.startsWith(LUCIDE_PREFIX)) {
    const key = value.slice(LUCIDE_PREFIX.length) as LucideIconName;
    return LUCIDE_ICONS[key]?.label ?? "Icon";
  }
  return EMOJI.find((entry) => entry.emoji === value)?.label ?? value;
}

function GlyphButton({
  value,
  selected,
  onSelect,
}: {
  value: string;
  selected: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <button
      type="button"
      title={labelFor(value)}
      aria-label={labelFor(value)}
      aria-pressed={selected}
      onClick={() => onSelect(value)}
      className={cn(
        "flex size-8 items-center justify-center rounded-md border border-transparent text-base transition-colors hover:bg-muted",
        selected ? "border-primary/40 bg-primary-soft text-primary" : "",
      )}
    >
      <IconGlyph value={value} className="size-4 text-current" />
    </button>
  );
}

/**
 * Picker surface. `onSelect` receives an emoji or a "lucide:Name" token.
 * Used both as a value selector (project/role/profile icon) and as an
 * insert-at-cursor helper for descriptions.
 */
export function EmojiIconPicker({
  value,
  onSelect,
  onClear,
  clearLabel = "Remove icon",
  emojiOnly = false,
}: {
  value?: string | null | undefined;
  onSelect: (value: string) => void;
  onClear?: (() => void) | undefined;
  clearLabel?: string | undefined;
  emojiOnly?: boolean | undefined;
}) {
  const [term, setTerm] = useState("");
  const [recent, setRecent] = useState<string[]>(() => readRecent());

  const query = term.trim().toLowerCase();

  const emoji = useMemo(
    () =>
      query
        ? EMOJI.filter(
            (entry) => entry.label.toLowerCase().includes(query) || entry.emoji.includes(term),
          )
        : EMOJI,
    [query, term],
  );

  const icons = useMemo(() => {
    const entries = Object.entries(LUCIDE_ICONS) as Array<
      [LucideIconName, (typeof LUCIDE_ICONS)[LucideIconName]]
    >;
    return query
      ? entries.filter(
          ([name, entry]) =>
            entry.label.toLowerCase().includes(query) || name.toLowerCase().includes(query),
        )
      : entries;
  }, [query]);

  const choose = (next: string) => {
    rememberRecent(next);
    setRecent(readRecent());
    onSelect(next);
  };

  return (
    <div className="w-72 space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="icon-picker-search" className="sr-only">
          Search icons or emoji
        </label>
        <Input
          id="icon-picker-search"
          value={term}
          placeholder="Search icons or emoji…"
          className="h-8"
          onChange={(event) => setTerm(event.target.value)}
        />
      </div>

      {recent.length > 0 && !query ? (
        <section>
          <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Recent
          </p>
          <div className="flex flex-wrap gap-1">
            {recent.map((entry) => (
              <GlyphButton
                key={`recent-${entry}`}
                value={entry}
                selected={value === entry}
                onSelect={choose}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Emoji
        </p>
        {emoji.length === 0 ? (
          <p className="text-xs text-muted-foreground">No emoji match that search.</p>
        ) : (
          <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
            {emoji.map((entry) => (
              <GlyphButton
                key={entry.emoji}
                value={entry.emoji}
                selected={value === entry.emoji}
                onSelect={choose}
              />
            ))}
          </div>
        )}
      </section>

      {emojiOnly ? null : (
      <section>
        <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Icons
        </p>
        {icons.length === 0 ? (
          <p className="text-xs text-muted-foreground">No icons match that search.</p>
        ) : (
          <div className="flex max-h-36 flex-wrap gap-1 overflow-y-auto">
            {icons.map(([name]) => (
              <GlyphButton
                key={name}
                value={`${LUCIDE_PREFIX}${name}`}
                selected={value === `${LUCIDE_PREFIX}${name}`}
                onSelect={choose}
              />
            ))}
          </div>
        )}
      </section>
      )}

      <p className="text-[11px] text-muted-foreground">
        You can also paste any emoji straight into the field.
      </p>

      {onClear ? (
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onClear}>
          <X className="size-3.5" aria-hidden />
          {clearLabel}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Compact form control: a square preview button that opens the picker.
 * `value` is null when nothing is chosen yet.
 */
export function IconPickerField({
  value,
  onChange,
  label = "icon",
  buttonId,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string | undefined;
  buttonId?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={buttonId}
          type="button"
          variant="outline"
          className="h-10 gap-2 px-3"
          aria-label={value ? `Change ${label}` : `Add ${label}`}
        >
          {value ? (
            <IconGlyph value={value} className="size-4 text-base" />
          ) : (
            <Plus className="size-4" aria-hidden />
          )}
          <span className="text-xs">{value ? `Change ${label}` : `Add ${label}`}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <EmojiIconPicker
          value={value}
          onSelect={(next) => {
            onChange(next);
            setOpen(false);
          }}
          {...(value ? { onClear: () => { onChange(null); setOpen(false); }, clearLabel: `Remove ${label}` } : {})}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Inserts an emoji/icon into a text field at the cursor position. */
export function IconInsertButton({
  onInsert,
  label = "Insert emoji",
}: {
  onInsert: (value: string) => void;
  label?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label={label}>
          <Plus className="size-3.5" aria-hidden />
          Emoji
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-3">
        <EmojiIconPicker
          emojiOnly
          onSelect={(next) => {
            onInsert(next);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
