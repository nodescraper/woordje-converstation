import { cn } from "@/lib/utils";

// Renders an annotated sentence: known/gap/unknown words are tappable.
export function AnnotatedText({ annotated, onWord }) {
  if (!annotated) return null;
  return (
    <span>
      {annotated.tokens.map((t, i) => {
        const space = i > 0 && t.kind !== "punct" ? " " : "";
        if (t.kind === "punct" || t.kind === "stop") {
          return (
            <span key={i}>
              {space}
              {t.surface}
            </span>
          );
        }
        const cls =
          t.kind === "known" ? "w-known" : t.kind === "gap" ? "w-gap" : "w-unknown";
        return (
          <span key={i}>
            {space}
            <span className={cls} onClick={() => onWord?.(t)}>
              {t.surface}
              {t.pos_abbr && (
                <sup className="ml-0.5 font-mono text-[9px] opacity-60">{t.pos_abbr}</sup>
              )}
            </span>
          </span>
        );
      })}
    </span>
  );
}
