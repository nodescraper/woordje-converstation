import { useEffect, useState } from "react";
import { fetchWord } from "@/api/client";
import { Button } from "@/components/ui/button";
import { X, Plus, Check, Volume2, Languages, BookOpenText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

function Section({ icon: Icon, title, children }) {
  return (
    <section className="mt-5 border border-border bg-secondary p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-foreground" />
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
}

export function WordSheet({ token, lang, isKnown, onAdd, onClose, className, bordered = true, showClose = true }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setData(null);
    fetchWord({ lemma: token.lemma, lang })
      .then((d) => alive && setData(d))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token.lemma, lang]);

  return (
    <div className={cn("h-full min-h-0 overflow-y-auto bg-card p-5", bordered && "border-l border-border", className)}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="font-serif text-2xl">{token.surface || token.lemma}</div>
          {token.surface && token.surface !== token.lemma && (
            <div className="mt-1 text-sm text-muted-foreground">lemma: {token.lemma}</div>
          )}
          <div className="mt-0.5 font-mono text-xs text-muted-foreground">
            {data?.partOfSpeech || token.pos || "—"}
            {data?.rank ? ` · rank ~${data.rank.toLocaleString()}` : ""}
          </div>
        </div>
        {showClose && (
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="min-h-[2rem] text-sm">
        {loading ? (
          <span className="text-muted-foreground">looking up…</span>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Quick meaning
              </div>
              <div className="mt-1 text-base text-foreground">{data?.meaning}</div>
            </div>

            {data?.pronunciation && (
              <div className="inline-flex items-center gap-2 border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <Volume2 className="h-3.5 w-3.5 text-foreground" />
                <span>{data.pronunciation}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {!loading && data?.definition && data.definition !== data.meaning && (
        <Section icon={BookOpenText} title="Definition">
          <p className="text-sm leading-relaxed text-muted-foreground">{data.definition}</p>
        </Section>
      )}

      {!loading && data?.translations?.length > 0 && (
        <Section icon={Languages} title="Translations">
          <div className="flex flex-wrap gap-2">
            {data.translations.map((translation) => (
              <span
                key={translation}
                className="border border-border bg-card px-2.5 py-1 text-xs text-foreground"
              >
                {translation}
              </span>
            ))}
          </div>
        </Section>
      )}

      {!loading && data?.examples?.length > 0 && (
        <Section icon={Sparkles} title="Examples">
          <ul className="space-y-2">
            {data.examples.map((example) => (
              <li key={example} className="border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                {example}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {token.morph?.length > 0 && (
        <Section icon={BookOpenText} title="Grammar notes">
          <ul className="space-y-2">
            {token.morph.map((m, i) => (
              <li key={i} className="text-xs">
                <span className="font-semibold text-foreground">{m.label}</span>
                <span className="text-muted-foreground"> — {m.explain}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="mt-4">
        {isKnown ? (
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <Check className="h-4 w-4" /> in your vocabulary
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onAdd(token.lemma, data?.meaning || "")}
          >
            <Plus className="h-4 w-4" /> Add to vocabulary
          </Button>
        )}
      </div>
    </div>
  );
}
