import { useMemo, useState, useEffect } from "react";
import { BookOpen, Languages, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { VocabManager } from "@/components/vocab/VocabManager";
import { WordSheet } from "@/components/vocab/WordSheet";

function collectGrammar(messages) {
  const map = new Map();
  for (const msg of messages) {
    const annotated = msg.analysis || msg.annotated;
    const constructions = annotated?.grammar?.all || (annotated?.grammar?.primary ? [annotated.grammar.primary] : []);
    for (const construction of constructions) {
      if (!construction?.id) continue;
      const prev = map.get(construction.id) || {
        ...construction,
        count: 0,
        seenIn: new Set(),
        sampleText: annotated?.text || construction.example || "",
      };
      prev.count += 1;
      prev.seenIn.add(msg.role === "user" ? "your messages" : "assistant replies");
      if (!prev.sampleText && annotated?.text) prev.sampleText = annotated.text;
      map.set(construction.id, prev);
    }
  }
  return [...map.values()]
    .map((entry) => ({ ...entry, seenIn: [...entry.seenIn] }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function EmptyWordState() {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
      Tap any highlighted word in the chat to inspect it here.
    </div>
  );
}

function GrammarPanel({ messages }) {
  const items = useMemo(() => collectGrammar(messages), [messages]);

  return (
    <div className="h-full min-h-0 overflow-y-auto p-4">
      <div className="mb-4">
        <h2 className="font-serif text-lg">Grammar found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Constructions detected across your messages and the assistant’s replies.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-border p-4 text-sm text-muted-foreground">
          No grammar patterns detected yet. Start the conversation and they’ll show up here.
        </div>
      ) : (
        <div className="border border-border bg-border">
          {items.map((item) => (
            <article key={item.id} className="border-b border-border bg-card p-4 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">{item.name}</h3>
                <span className="tone-gap border px-2 py-0.5 text-xs">
                  {item.count}x
                </span>
              </div>
              {item.explain && (
                <p className="mt-2 text-sm text-muted-foreground">{item.explain}</p>
              )}
              {item.example && (
                <div className="tone-known mt-3 border px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Example:</span> {item.example}
                </div>
              )}
              {item.sampleText && (
                <div className="mt-3 text-xs text-muted-foreground">
                  Seen in: “{item.sampleText.length > 110 ? `${item.sampleText.slice(0, 107)}...` : item.sampleText}”
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function SessionSidebar({
  messages,
  vocab,
  activeWord,
  lang,
  onAddWord,
  onRemoveWord,
  onCloseWord,
}) {
  const [tab, setTab] = useState("vocab");

  useEffect(() => {
    if (activeWord) setTab("word");
  }, [activeWord]);

  const tabs = [
    { id: "vocab", label: "Vocab", icon: BookOpen },
    { id: "grammar", label: "Grammar", icon: Languages },
    { id: "word", label: "Word", icon: Sparkles },
  ];

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
      <div className="border-b border-border p-3">
        <div className="grid grid-cols-3 gap-px border border-border bg-border">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex items-center justify-center gap-2 bg-card px-3 py-2 text-sm font-semibold transition-colors",
                  tab === item.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "vocab" && (
          <VocabManager items={vocab.items} onAdd={onAddWord} onRemove={onRemoveWord} bordered={false} />
        )}
        {tab === "grammar" && <GrammarPanel messages={messages} />}
        {tab === "word" &&
          (activeWord ? (
            <WordSheet
              token={activeWord}
              lang={lang}
              isKnown={vocab.has(activeWord.lemma)}
              onAdd={onAddWord}
              onClose={onCloseWord}
              bordered={false}
              showClose={false}
            />
          ) : (
            <EmptyWordState />
          ))}
      </div>
    </aside>
  );
}
