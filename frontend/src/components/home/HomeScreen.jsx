import { ArrowRight, BookOpen, MessagesSquare, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { flagFor } from "@/config/languages";

export function HomeScreen({
  lang,
  langName,
  hasSession,
  onStartSession,
  onResumeSession,
  onOpenVocab,
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl border-x border-border">
        <section className="border-b border-border px-6 py-12">
          <div className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Conversation practice
          </div>
          <h1 className="font-serif text-5xl font-semibold text-foreground">Start a session when you’re ready.</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Pick up your current session, start a new one, or jump into your saved vocabulary for {langName}.
          </p>
        </section>

        <section className="border-b border-border">
          <div className="border-b border-border p-6">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Badge className="border-foreground text-foreground">
                    {flagFor(lang)} {langName}
                  </Badge>
                </div>
                <h2 className="font-serif text-2xl font-semibold">Sessions</h2>
              </div>
              <MessagesSquare className="h-5 w-5 text-foreground" />
            </div>

            <div className="grid gap-px border border-border bg-border">
              <Button
                size="lg"
                className="w-full justify-between border-0 bg-card text-foreground shadow-none hover:bg-secondary"
                onClick={onStartSession}
              >
                Start a new session
                <PlayCircle className="h-4 w-4" />
              </Button>
              {hasSession && (
                <Button
                  size="lg"
                  variant="ghost"
                  className="w-full justify-between border-0 bg-card text-foreground shadow-none hover:bg-secondary"
                  onClick={onResumeSession}
                >
                  Resume current session
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl font-semibold">Vocabulary</h2>
                <p className="text-sm text-muted-foreground">
                  Open the full vocabulary page to filter, review, and manage your words.
                </p>
              </div>
              <BookOpen className="h-5 w-5 text-foreground" />
            </div>

            <div className="grid gap-px border border-border bg-border">
              <Button
                size="lg"
                variant="ghost"
                className="w-full justify-between border-0 bg-card text-foreground shadow-none hover:bg-secondary"
                onClick={onOpenVocab}
              >
                Open vocabulary page
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <section className="px-6 py-4 text-xs text-muted-foreground">
          Built for structured conversation practice with a wireframe-style workspace.
        </section>
      </div>
    </div>
  );
}
