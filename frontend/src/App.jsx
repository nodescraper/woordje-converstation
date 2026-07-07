import { useEffect, useMemo, useState } from "react";
import { BookOpen, CircleHelp, Globe, Home, Info, MessageSquare, Newspaper, Plus, UserRound } from "lucide-react";
import { getMeta } from "@/api/client";
import { useVocab } from "@/store/useVocab";
import { useSettings } from "@/store/useSettings";
import { useChat } from "@/hooks/useChat";
import { HomeScreen } from "@/components/home/HomeScreen";
import { StartScreen } from "@/components/start/StartScreen";
import { ChatView } from "@/components/chat/ChatView";
import { HelpDoc } from "@/components/help/HelpDoc";
import { SessionSidebar } from "@/components/session/SessionSidebar";
import { VocabPage } from "@/components/vocab/VocabPage";
import { Button } from "@/components/ui/button";
import { Popup } from "@/components/ui/popup";
import { nameOf, flagFor } from "@/config/languages";

export default function App() {
  const [meta, setMeta] = useState({
    providers: [],
    languages: [],
    spacy: true,
    wordfreq: true,
    defaultProvider: null,
    defaultModel: null,
  });
  const [screen, setScreen] = useState("home");
  const [article, setArticle] = useState(null);
  const [activeWord, setActiveWord] = useState(null);
  const [showSessionInfo, setShowSessionInfo] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const { settings, patch, persona, effectiveTopic } = useSettings();

  const lang = settings.lang || meta.defaultLang || "nl";
  const langName = nameOf(lang, meta.languages);
  const vocab = useVocab(lang);
  const activeProvider = useMemo(
    () => meta.providers.find((provider) => provider.key === settings.provider) || meta.providers[0] || null,
    [meta.providers, settings.provider]
  );
  const focusTargets = useMemo(() => {
    const custom = (settings.customTargetWords || "")
      .split(/[,\n]/)
      .map((word) => word.trim())
      .filter(Boolean);
    return custom.length > 0 ? custom : vocab.words.slice(0, 12);
  }, [settings.customTargetWords, vocab.words]);
  const effectivePersona = useMemo(() => {
    const extra = (settings.customAgentContext || "").trim();
    if (!extra) return persona;
    return {
      ...persona,
      prompt: `${persona?.prompt || ""}\n\nAdditional session instructions: ${extra}`.trim(),
    };
  }, [persona, settings.customAgentContext]);

  useEffect(() => {
    getMeta()
      .then((m) => {
        setMeta(m);
        if (!settings.lang && m.defaultLang) patch({ lang: m.defaultLang });
        if (!settings.provider && m.defaultProvider) {
          patch({
            provider: m.defaultProvider,
            model: m.defaultModel || m.providers?.find((provider) => provider.key === m.defaultProvider)?.models?.[0] || null,
          });
          return;
        }
        const selectedProvider = m.providers?.find((provider) => provider.key === (settings.provider || m.defaultProvider));
        if (selectedProvider && !selectedProvider.models?.includes(settings.model)) {
          patch({ model: selectedProvider.models?.[0] || selectedProvider.model || null });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeProvider) return;
    if (activeProvider.models?.length > 0 && !activeProvider.models.includes(settings.model)) {
      patch({ model: activeProvider.models[0] });
    }
  }, [activeProvider, patch, settings.model]);

  const chat = useChat({
    lang,
    level: settings.level,
    topic: effectiveTopic,
    persona: effectivePersona,
    provider: settings.provider,
    model: settings.model,
    vocab: vocab.words,
    targets: focusTargets,
    article,
  });

  const hasSession = chat.messages.length > 0;

  const handleStart = ({ article: loadedArticle }) => {
    chat.reset();
    setArticle(loadedArticle || null);
    setActiveWord(null);
    setScreen("session");
    setTimeout(() => chat.start(true), 0);
  };

  const openSetup = () => {
    setScreen("setup");
    setActiveWord(null);
  };

  if (screen === "home") {
    return (
      <HomeScreen
        lang={lang}
        langName={langName}
        hasSession={hasSession}
        onStartSession={openSetup}
        onResumeSession={() => setScreen("session")}
        onOpenVocab={() => setScreen("vocab")}
      />
    );
  }

  if (screen === "vocab") {
    return (
      <VocabPage
        lang={lang}
        langName={langName}
        items={vocab.items}
        onAdd={vocab.add}
        onRemove={vocab.remove}
        onBack={() => setScreen("home")}
      />
    );
  }

  if (screen === "setup") {
    return (
      <StartScreen
        settings={settings}
        patch={patch}
        meta={meta}
        onStart={handleStart}
        onBack={() => setScreen("home")}
      />
    );
  }

  return (
    <div className="flex h-screen min-h-0 flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center border border-border bg-secondary text-foreground">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-serif text-lg font-semibold">Conversation Practice</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowHelp(true)} aria-label="Help">
              <CircleHelp className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowSessionInfo(true)} aria-label="Session info">
              <Info className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setScreen("home")}>
              <Home className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setScreen("vocab")}>
              <BookOpen className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={openSetup}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New session</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] overflow-hidden">
        <div className="min-h-0 overflow-hidden">
          <ChatView
            messages={chat.messages}
            busy={chat.busy}
            onSend={chat.send}
            onRetry={chat.retry}
            onWord={setActiveWord}
            langName={langName}
          />
        </div>
        <div className="min-h-0 overflow-hidden border-l border-border">
          <SessionSidebar
            messages={chat.messages}
            vocab={vocab}
            activeWord={activeWord}
            lang={lang}
            onAddWord={(lemma, translation) => {
              vocab.add(lemma, translation);
              setActiveWord(null);
            }}
            onRemoveWord={vocab.remove}
            onCloseWord={() => setActiveWord(null)}
          />
        </div>
      </div>

      <Popup
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="Help"
        description="A quick guide to the annotations, panels, and conversation flow."
        className="max-w-3xl"
      >
        <HelpDoc />
      </Popup>

      <Popup
        open={showSessionInfo}
        onClose={() => setShowSessionInfo(false)}
        title="Session info"
        description="Current language, source, level, and conversation setup."
      >
        <div className="border border-border bg-border">
          <div className="flex items-start gap-3 border-b border-border bg-card p-4">
            <Globe className="mt-0.5 h-4 w-4 text-foreground" />
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Language</div>
              <div className="mt-1 font-medium">{flagFor(lang)} {langName}</div>
            </div>
          </div>
          <div className="flex items-start gap-3 border-b border-border bg-card p-4">
            {article ? <Newspaper className="mt-0.5 h-4 w-4 text-foreground" /> : <MessageSquare className="mt-0.5 h-4 w-4 text-foreground" />}
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Source</div>
              <div className="mt-1 font-medium">{article ? "Article session" : effectiveTopic}</div>
            </div>
          </div>
          <div className="flex items-start gap-3 border-b border-border bg-card p-4">
            <UserRound className="mt-0.5 h-4 w-4 text-foreground" />
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Partner</div>
              <div className="mt-1 font-medium">{persona?.emoji ? `${persona.emoji} ` : ""}{persona?.name || "No partner selected"}</div>
              {persona?.prompt && (
                <div className="mt-1 text-sm text-muted-foreground">{persona.prompt}</div>
              )}
              {settings.customAgentContext?.trim() && (
                <div className="mt-2 border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground">
                  Extra context: {settings.customAgentContext.trim()}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3 bg-card p-4">
            <Info className="mt-0.5 h-4 w-4 text-foreground" />
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Level and model</div>
              <div className="mt-1 font-medium">{settings.level} · {settings.model || activeProvider?.model || "No model selected"}</div>
              {focusTargets.length > 0 && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Focus words: {focusTargets.slice(0, 8).join(", ")}{focusTargets.length > 8 ? "..." : ""}
                </div>
              )}
            </div>
          </div>
        </div>
      </Popup>
    </div>
  );
}
