import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function VocabManager({ items, onAdd, onRemove, className, bordered = true }) {
  const [word, setWord] = useState("");
  const [tr, setTr] = useState("");

  const submit = () => {
    if (!word.trim()) return;
    onAdd(word, tr);
    setWord("");
    setTr("");
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden bg-card", bordered && "border-l border-border", className)}>
      <div className="border-b border-border p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-lg">Your vocabulary</h2>
          <span className="font-mono text-xs text-muted-foreground">{items.length} words</span>
        </div>
        <div className="flex gap-2">
          <Input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="word"
            className="flex-1"
          />
          <Input
            value={tr}
            onChange={(e) => setTr(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="translation"
            className="flex-1"
          />
          <Button size="icon" onClick={submit} aria-label="Add word">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No words yet. Add some, or tap words in the chat to save them.
          </p>
        ) : (
          <ul className="border border-border bg-border">
            {items.map((it) => (
              <li
                key={it.word}
                className="group flex items-center justify-between border-b border-border bg-card px-3 py-2 last:border-b-0 hover:bg-secondary"
              >
                <div>
                  <span className="font-medium">{it.word}</span>
                  {it.translation && (
                    <span className="ml-2 text-sm text-muted-foreground">{it.translation}</span>
                  )}
                </div>
                <button
                  onClick={() => onRemove(it.word)}
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  aria-label={`Remove ${it.word}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
