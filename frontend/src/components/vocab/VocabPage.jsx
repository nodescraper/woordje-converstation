import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { flagFor } from "@/config/languages";

export function VocabPage({ lang, langName, items, onAdd, onRemove, onBack }) {
  const [query, setQuery] = useState("");
  const [word, setWord] = useState("");
  const [translation, setTranslation] = useState("");

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.word.toLowerCase().includes(q) ||
        (item.translation || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  const submit = () => {
    if (!word.trim()) return;
    onAdd(word, translation);
    setWord("");
    setTranslation("");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl border-x border-border">
        <div className="fixed left-1/2 top-0 z-20 w-full max-w-6xl -translate-x-1/2 border-b border-border bg-background">
          <div className="border-x border-border px-6 py-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </div>
        </div>

        <div className="border-b border-border px-6 pb-10 pt-24">
          <div className="mb-2 flex items-center gap-2">
            <Badge className="border-foreground text-foreground">
              {flagFor(lang)} {langName}
            </Badge>
          </div>
          <h1 className="font-serif text-4xl font-semibold text-foreground">Your vocabulary</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Browse, filter, and maintain your saved words for this language in one place.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <section className="min-w-0 divide-y divide-border lg:border-r lg:border-border">
            <div className="px-6 py-6">
              <div className="flex items-center gap-3 border border-border bg-card px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter by word or translation"
                  className="h-auto border-0 bg-transparent px-0 py-0 focus-visible:ring-0"
                />
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="px-6 py-10 text-sm text-muted-foreground">
                {items.length === 0
                  ? "No words yet. Add some here or tap words while chatting."
                  : "No words match that filter."}
              </div>
            ) : (
              <div>
                {filteredItems.map((item) => (
                  <div
                    key={item.word}
                    className="flex items-center justify-between gap-4 border-b border-border px-6 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{item.word}</div>
                      {item.translation ? (
                        <div className="mt-1 text-sm text-muted-foreground">{item.translation}</div>
                      ) : null}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onRemove(item.word)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="border-t border-border bg-card lg:border-t-0">
            <aside className="lg:sticky lg:top-[73px] lg:self-start">
              <div className="border-b border-border px-6 py-6">
                <div className="flex items-center gap-2 text-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">Vocabulary tools</span>
                </div>
                <h2 className="mt-3 font-serif text-2xl">Manage words</h2>
              </div>

              <div className="divide-y divide-border text-sm">
                <div className="px-6 py-4">
                  <div className="text-muted-foreground">Language</div>
                  <div className="mt-1 font-semibold">{langName}</div>
                </div>
                <div className="px-6 py-4">
                  <div className="text-muted-foreground">Saved words</div>
                  <div className="mt-1 font-semibold">{items.length}</div>
                </div>
                <div className="px-6 py-4">
                  <div className="text-muted-foreground">Filtered results</div>
                  <div className="mt-1 font-semibold">{filteredItems.length}</div>
                </div>
              </div>

              <div className="border-t border-border px-6 py-6">
                <div className="mb-4 flex items-center gap-2 text-foreground">
                  <Plus className="h-4 w-4" />
                  <span className="font-semibold">Add a word</span>
                </div>
                <div className="space-y-2">
                  <Input
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder="word"
                  />
                  <Input
                    value={translation}
                    onChange={(e) => setTranslation(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder="translation"
                  />
                  <Button className="w-full" onClick={submit}>
                    Add word
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
