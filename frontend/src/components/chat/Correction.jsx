import { useState } from "react";
import { Check, PencilLine, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Correction({ correction, original }) {
  const [open, setOpen] = useState(false);
  if (!correction) return null;
  if (correction.error) {
    return <div className="mt-1 text-xs text-muted-foreground">{correction.error}</div>;
  }
  if (correction.clean) {
    return (
      <div className="tone-success mt-1 inline-flex items-center gap-1.5 border px-2 py-1 text-xs">
        <Check className="h-3.5 w-3.5" /> looks correct
      </div>
    );
  }
  const changes = correction.changes || [];
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
      >
        <PencilLine className="h-3.5 w-3.5" />
        {changes.length || 1} correction{changes.length === 1 ? "" : "s"}
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="mt-2 space-y-2 border border-border bg-card p-3 text-sm">
          <div>
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              you wrote
            </div>
            <div className="tone-error border px-3 py-2 line-through">{original}</div>
          </div>
          <div>
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              better
            </div>
            <div className="tone-success border px-3 py-2">{correction.corrected}</div>
          </div>
          {changes.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 pt-1">
              {changes.map((c, i) => (
                <li key={i} className="border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
