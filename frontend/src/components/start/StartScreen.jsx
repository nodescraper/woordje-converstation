import { useMemo, useState } from "react";
import { ArrowLeft, Check, Loader2, Newspaper, Sparkles } from "lucide-react";
import { PERSONAS } from "@/config/personas";
import { TOPICS } from "@/config/topics";
import { LEVELS } from "@/config/levels";
import { fetchArticle } from "@/api/client";
import { nameOf, capabilitySummary } from "@/config/languages";
import { LanguagePicker } from "@/components/settings/LanguagePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function Tile({ selected, onClick, emoji, children, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 border p-4 text-left transition-colors",
        selected ? "border-foreground bg-secondary" : "border-border bg-card hover:bg-secondary"
      )}
    >
      {emoji && <span className="text-xl">{emoji}</span>}
      <span className="font-semibold">{children}</span>
      {hint ? <span className="text-sm text-muted-foreground">{hint}</span> : null}
    </button>
  );
}

function ProviderPicker({ providers, settings, patch }) {
  if (providers.length === 0) return null;
  const selectedProvider =
    providers.find((provider) => provider.key === settings.provider) || providers[0];
  const availableModels = selectedProvider?.models || [];

  return (
    <div className="space-y-4">
      <div>
        <Label>Provider</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {providers.map((provider) => (
            <button
              key={provider.key}
              type="button"
              disabled={!provider.available}
              onClick={() =>
                patch({
                  provider: provider.key,
                  model: provider.models?.[0] || provider.model || null,
                })
              }
              className={cn(
                "border p-3 text-left transition-colors",
                settings.provider === provider.key
                  ? "border-foreground bg-secondary"
                  : "border-border bg-card hover:bg-secondary",
                !provider.available && "cursor-not-allowed opacity-40"
              )}
            >
              <div className="font-semibold">{provider.label}</div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">
                {provider.available ? (provider.local ? "local · ready" : "cloud · ready") : "unavailable"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedProvider?.available && availableModels.length > 0 && (
        <div>
          <Label>{selectedProvider.local ? "Available local models" : "Model"}</Label>
          <div className="mt-2 grid gap-2">
            {availableModels.map((model) => (
              <button
                key={model}
                type="button"
                onClick={() => patch({ provider: selectedProvider.key, model })}
                className={cn(
                  "border px-4 py-3 text-left font-mono text-sm transition-colors",
                  settings.model === model
                    ? "border-foreground bg-secondary text-foreground"
                    : "border-border bg-card hover:bg-secondary"
                )}
              >
                {model}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function StartScreen({ settings, patch, meta, onStart, onBack }) {
  const [sourceMode, setSourceMode] = useState("topic");
  const [articleUrl, setArticleUrl] = useState("");
  const [article, setArticle] = useState(null);
  const [articleState, setArticleState] = useState({ loading: false, msg: "" });
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(settings.customAgentContext?.trim() || settings.customTargetWords?.trim())
  );

  const languages = meta?.languages || [];
  const providers = (meta?.providers || []).filter((provider) => provider.available);
  const lang = settings.lang || meta?.defaultLang || "nl";
  const langName = nameOf(lang, languages);
  const activeLang = languages.find((entry) => entry.code === lang);
  const activeProvider = providers.find((provider) => provider.key === settings.provider) || providers[0];
  const effectiveTopic = settings.topic === "custom" ? settings.customTopic.trim() : settings.topic;
  const canStart = sourceMode === "article" ? Boolean(article?.text) : Boolean(effectiveTopic);

  const summary = useMemo(() => {
    if (sourceMode === "article") {
      return article?.title ? `Article: ${article.title}` : "Article conversation";
    }
    return `Topic: ${effectiveTopic || "Choose a topic"}`;
  }, [article?.title, effectiveTopic, sourceMode]);

  const loadArticle = async () => {
    if (!articleUrl.trim()) {
      setArticle(null);
      setArticleState({ loading: false, msg: "" });
      return;
    }
    setArticleState({ loading: true, msg: "" });
    try {
      const response = await fetchArticle(articleUrl.trim());
      if (response.ok) {
        setArticle({ title: response.title, text: response.text });
        setArticleState({ loading: false, msg: `ok:${response.title || "article"}` });
      } else {
        setArticle(null);
        setArticleState({ loading: false, msg: `err:${response.error || "Couldn't load."}` });
      }
    } catch {
      setArticle(null);
      setArticleState({ loading: false, msg: "err:Couldn't reach the server." });
    }
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
          <div className="mb-1 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Session setup
          </div>
          <h1 className="font-serif text-4xl font-semibold text-foreground">Build one clean session at a time.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Pick your language, partner, level, and one conversation source. Topic and article are separated so the setup stays clear.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div className="divide-y divide-border lg:border-r lg:border-border">
            <section className="px-6 py-6">
              <Label>Language</Label>
              <div className="mt-2">
                <LanguagePicker
                  languages={languages}
                  value={lang}
                  onChange={(code) => patch({ lang: code })}
                />
              </div>
              {activeLang && (
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                  {activeLang.name}: {capabilitySummary(activeLang)}
                </p>
              )}
            </section>

            <section className="px-6 py-6">
              <Label>Who do you want to talk with?</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PERSONAS.map((persona) => (
                  <Tile
                    key={persona.id}
                    emoji={persona.emoji}
                    selected={settings.personaId === persona.id}
                    onClick={() => patch({ personaId: persona.id })}
                  >
                    {persona.name}
                  </Tile>
                ))}
              </div>
            </section>

            <section className="px-6 py-6">
              <Label>Level</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => patch({ level })}
                    className={cn(
                      "border px-4 py-2 font-semibold",
                      settings.level === level
                        ? "border-foreground bg-secondary text-foreground"
                        : "border-border bg-card hover:bg-secondary"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </section>

            <section className="px-6 py-6">
              <Label>Conversation source</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Tile
                  emoji="💬"
                  hint="Pick a topic and start right away."
                  selected={sourceMode === "topic"}
                  onClick={() => setSourceMode("topic")}
                >
                  Topic
                </Tile>
                <Tile
                  emoji="📰"
                  hint="Load one article and talk about that."
                  selected={sourceMode === "article"}
                  onClick={() => setSourceMode("article")}
                >
                  Article
                </Tile>
              </div>
            </section>

            <section className="px-6 py-6">
              {sourceMode === "topic" ? (
                <div>
                  <Label>Topic</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {TOPICS.map((topic) => (
                      <Tile
                        key={topic.id}
                        emoji={topic.emoji}
                        selected={settings.topic === topic.id}
                        onClick={() => patch({ topic: topic.id })}
                      >
                        {topic.label}
                      </Tile>
                    ))}
                  </div>
                  <div
                    className={cn(
                      "mt-3 border p-4 transition-colors",
                      settings.topic === "custom"
                        ? "border-foreground bg-secondary"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✏️</span>
                      <div>
                        <div className="font-semibold">Define your own topic</div>
                        <div className="text-sm text-muted-foreground">
                          Use any situation or theme you want.
                        </div>
                      </div>
                    </div>
                    <Input
                      className="mt-3"
                      value={settings.customTopic}
                      onFocus={() => patch({ topic: "custom" })}
                      onChange={(e) => patch({ topic: "custom", customTopic: e.target.value })}
                      placeholder="Type your own topic, e.g. ordering coffee at a cafe"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Article link</Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={articleUrl}
                      onChange={(e) => setArticleUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && loadArticle()}
                      placeholder="Paste a news URL to discuss"
                    />
                    <Button variant="outline" onClick={loadArticle} disabled={articleState.loading}>
                      {articleState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load"}
                    </Button>
                  </div>
                  {articleState.msg.startsWith("ok:") && (
                    <div className="mt-2 flex items-center gap-1.5 text-sm text-foreground">
                      <Check className="h-4 w-4" /> Loaded: <b className="text-foreground">{articleState.msg.slice(3)}</b>
                    </div>
                  )}
                  {articleState.msg.startsWith("err:") && (
                    <div className="mt-2 text-sm text-foreground">{articleState.msg.slice(4)}</div>
                  )}
                </div>
              )}
            </section>

            <section className="px-6 py-6">
              <ProviderPicker providers={providers} settings={settings} patch={patch} />
            </section>

            <section className="px-6 py-6">
              <button
                type="button"
                onClick={() => setShowAdvanced((open) => !open)}
                className="flex w-full items-center justify-between border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-secondary"
              >
                <div>
                  <div className="font-semibold">Advanced settings</div>
                  <div className="text-sm text-muted-foreground">
                    Adjust extra agent context and which vocabulary the model should favor.
                  </div>
                </div>
                <span className="font-mono text-xs uppercase text-muted-foreground">
                  {showAdvanced ? "hide" : "show"}
                </span>
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-4 border border-border bg-card p-4">
                  <div>
                    <Label htmlFor="agent-context">Extra agent context</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add session-specific instructions for the conversation partner.
                    </p>
                    <textarea
                      id="agent-context"
                      value={settings.customAgentContext}
                      onChange={(e) => patch({ customAgentContext: e.target.value })}
                      placeholder="Example: Ask shorter follow-up questions and gently challenge me when I make mistakes."
                      className="mt-2 min-h-[120px] w-full border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>

                  <div>
                    <Label htmlFor="focus-words">Focus words override</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Comma-separated words the assistant should try to reuse instead of the automatic vocab shortlist.
                    </p>
                    <textarea
                      id="focus-words"
                      value={settings.customTargetWords}
                      onChange={(e) => patch({ customTargetWords: e.target.value })}
                      placeholder="Example: afspraak, vanavond, eigenlijk, proberen"
                      className="mt-2 min-h-[96px] w-full border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className="border-t border-border bg-card lg:sticky lg:top-[73px] lg:self-start lg:border-t-0">
            <div className="border-b border-border px-6 py-6">
              <div className="flex items-center gap-2 text-foreground">
                {sourceMode === "article" ? <Newspaper className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">Ready to start</span>
              </div>
              <h2 className="mt-3 font-serif text-2xl">Session summary</h2>
            </div>
            <div className="divide-y divide-border text-sm">
              <div className="px-6 py-4">
                <div className="text-muted-foreground">Language</div>
                <div className="mt-1 font-semibold">{langName}</div>
              </div>
              <div className="px-6 py-4">
                <div className="text-muted-foreground">Level and partner</div>
                <div className="mt-1 font-semibold">
                  {settings.level} with {PERSONAS.find((persona) => persona.id === settings.personaId)?.name}
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="text-muted-foreground">Source</div>
                <div className="mt-1 font-semibold">{summary}</div>
              </div>
              <div className="px-6 py-4">
                <div className="text-muted-foreground">Model</div>
                <div className="mt-1 font-mono text-xs text-foreground">
                  {activeProvider?.label || "No provider"}{settings.model ? ` · ${settings.model}` : ""}
                </div>
              </div>
              {(settings.customAgentContext?.trim() || settings.customTargetWords?.trim()) && (
                <div className="px-6 py-4">
                  <div className="text-muted-foreground">Advanced</div>
                  <div className="mt-1 space-y-2 text-sm">
                    {settings.customAgentContext?.trim() && (
                      <div>
                        <div className="font-semibold">Extra agent context</div>
                        <div className="text-muted-foreground">{settings.customAgentContext.trim()}</div>
                      </div>
                    )}
                    {settings.customTargetWords?.trim() && (
                      <div>
                        <div className="font-semibold">Focus words</div>
                        <div className="text-muted-foreground">{settings.customTargetWords.trim()}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-border px-6 py-6">
              <Button
                size="lg"
                className="w-full"
                disabled={!canStart}
                onClick={() => onStart({ article: sourceMode === "article" ? article : null })}
              >
                Start conversation
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
