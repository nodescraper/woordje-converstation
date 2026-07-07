import { flagFor, LANG_FALLBACK } from "@/config/languages";
import { cn } from "@/lib/utils";

// A small pill describing one capability, colour-coded by strength.
function Cap({ tone = "muted", children }) {
  const tones = {
    on: "tone-known",
    generic: "tone-gap",
    off: "tone-unknown",
    muted: "tone-unknown",
  };
  return (
    <span
      className={cn(
        "border px-1.5 py-0.5 font-mono text-[10px] leading-none",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

// `languages` is the array from /api/meta (may be empty before meta loads, in
// which case we fall back to a static list without capability badges).
export function LanguagePicker({ languages, value, onChange, columns = 3 }) {
  const list =
    languages && languages.length
      ? languages
      : LANG_FALLBACK.map((l) => ({ ...l, _fallback: true }));

  const grid =
    columns === 2 ? "sm:grid-cols-2" : columns === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3";

  return (
    <div className={cn("grid grid-cols-2 gap-2", grid)}>
      {list.map((l) => {
        const selected = value === l.code;
        const grammarTone =
          l.grammar === "full" ? "on" : l.grammar === "generic" ? "generic" : "off";
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => onChange(l.code)}
            className={cn(
              "flex flex-col gap-2 border p-3 text-left transition-colors",
              selected
                ? "border-foreground bg-secondary"
                : "border-border bg-card hover:border-muted-foreground/40"
            )}
          >
            <span className="flex items-center gap-2">
              <span className="text-lg leading-none">{flagFor(l.code)}</span>
              <span className="font-semibold">{l.name}</span>
            </span>
            {!l._fallback && (
              <span className="flex flex-wrap gap-1">
                <Cap tone={l.spacy ? "on" : "off"}>{l.spacy ? "spaCy" : "regex"}</Cap>
                <Cap tone={grammarTone}>
                  {l.grammar === "full" ? "grammar+" : l.grammar === "generic" ? "grammar" : "morph"}
                </Cap>
                {l.wordfreq && <Cap tone="on">freq</Cap>}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
