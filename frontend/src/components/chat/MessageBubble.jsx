import { useState, useEffect } from "react";
import { AnnotatedText } from "./AnnotatedText";
import { ThinkingTimeline } from "./ThinkingTimeline";
import { Correction } from "./Correction";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";

export function MessageBubble({ msg, onWord, onRetry }) {
  if (msg.role === "error") {
    return (
      <div className="mx-auto max-w-md border border-border bg-secondary p-3 text-center text-sm text-foreground">
        <div>{msg.text}</div>
        {msg.retryable && (
          <Button size="sm" variant="outline" className="mt-2" onClick={onRetry}>
            <RotateCw className="h-3.5 w-3.5" /> Try again
          </Button>
        )}
      </div>
    );
  }

  if (msg.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1 self-end">
        <div className="max-w-[80%] border border-border bg-secondary px-4 py-2.5 text-[15px]">
          {msg.analysis ? <AnnotatedText annotated={msg.analysis} onWord={onWord} /> : msg.text}
        </div>
        <div className="max-w-[80%]">
          {msg.loading ? (
            <span className="text-xs text-muted-foreground">checking…</span>
          ) : (
            <Correction correction={msg.correction} original={msg.text} />
          )}
        </div>
      </div>
    );
  }

  // bot
  return <BotBubble msg={msg} onWord={onWord} />;
}

function BotBubble({ msg, onWord }) {
  const [seconds, setSeconds] = useState(null);
  const [t0] = useState(Date.now());
  useEffect(() => {
    if (!msg.streaming && msg.thinking && seconds === null) {
      setSeconds(Math.max(1, Math.round((Date.now() - t0) / 1000)));
    }
  }, [msg.streaming, msg.thinking, seconds, t0]);

  return (
    <div className="flex max-w-[85%] flex-col self-start">
      {msg.replyTo && (
        <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="opacity-60">↩ replying to</span>
          <span className="truncate italic opacity-80">{msg.replyTo}</span>
        </div>
      )}
      <ThinkingTimeline raw={msg.thinking} streaming={msg.streaming} seconds={seconds} />
      <div className="border border-border bg-card px-4 py-3 text-[15px] leading-relaxed">
        {msg.annotated ? (
          <>
            <AnnotatedText annotated={msg.annotated} onWord={onWord} />
            {msg.annotated.grammar?.primary && (
              <div className="mt-2">
                <span className="tone-gap inline-block border px-2 py-0.5 text-xs font-semibold">
                  ✦ {msg.annotated.grammar.primary.name}
                </span>
              </div>
            )}
          </>
        ) : (
          <span>
            {msg.live}
            <span className="cursor-blink ml-0.5 text-foreground">▋</span>
          </span>
        )}
      </div>
    </div>
  );
}
