import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// A minimal right-side drawer. No Radix / no portal dependency — just a fixed
// overlay + panel. Closes on backdrop click and Escape. Rendered only when open.
export function Sheet({ open, onClose, title, description, children, className }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || "Panel"}
        className={cn(
          "relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card shadow-2xl",
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            {title && <h2 className="font-serif text-xl font-semibold">{title}</h2>}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}
