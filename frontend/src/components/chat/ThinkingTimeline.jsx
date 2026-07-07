import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Parse a reasoning model's freeform thinking into titled timeline steps.
function parseSteps(raw) {
  const text = (raw || "").replace(/\r/g, "").trim();
  if (!text) return [];
  const lines = text.split("\n").map((l) => l.trim());
  const steps = [];
  let buffer = [];
  const flush = () => {
    if (buffer.length) {
      steps.push(cleanTitle(buffer.join(" ")));
      buffer = [];
    }
  };
  for (const line of lines) {
    if (!line) continue;
    if (/^thinking\s*process\s*:?$/i.test(line)) continue;
    const structural = /^\d+[.)]\s+/.test(line) || /^[-*•]\s+/.test(line) || /^\*\*.+\*\*/.test(line);
    if (structural) {
      flush();
      buffer.push(line);
      flush();
    } else {
      buffer.push(line);
    }
  }
  flush();
  return steps.filter(Boolean).slice(0, 12);
}

function cleanTitle(s) {
  let t = s
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^[-*•]\s*/, "")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[:\-–—\s]+/, "")
    .trim();
  const colon = t.indexOf(":");
  if (colon > 0 && colon <= 48) t = t.slice(0, colon).trim();
  if (t.length > 70) t = t.slice(0, 68).trim() + "…";
  return t;
}

export function ThinkingTimeline({ raw, streaming, seconds }) {
  const [open, setOpen] = useState(streaming);
  const wasStreamingRef = useRef(streaming);
  const steps = useMemo(() => parseSteps(raw), [raw]);
  useEffect(() => {
    if (streaming) {
      setOpen(true);
    } else if (wasStreamingRef.current) {
      setOpen(false);
    }
    wasStreamingRef.current = streaming;
  }, [streaming]);

  if (!raw) return null;

  return (
    <div className="mb-1.5 overflow-hidden border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground"
      >
        {streaming ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground" />
        ) : (
          <Check className="h-3.5 w-3.5 text-foreground" />
        )}
        <span className="flex-1">
          {streaming ? "Thinking…" : seconds ? `Thought for ${seconds}s` : "Thought process"}
        </span>
        <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
      </button>

      {open && (
        <div className="px-4 pb-3">
          <ol className="relative ml-1">
            {steps.map((title, i) => (
              <li key={i} className="relative flex gap-3 pb-2.5 last:pb-0">
                {i < steps.length - 1 && (
                  <span className="absolute left-[5px] top-4 h-full w-px bg-border" />
                )}
                <span
                  className={cn(
                    "mt-1 h-2.5 w-2.5 flex-none rounded-full border-2",
                    i === steps.length - 1 && streaming
                      ? "border-foreground bg-foreground"
                      : "border-border bg-card"
                  )}
                />
                <span className="text-[13px] leading-snug text-muted-foreground">{title}</span>
              </li>
            ))}
          </ol>
          {!streaming && (
            <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap border border-dashed border-border bg-secondary p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {raw.trim()}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
