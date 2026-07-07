import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";

export function ChatView({ messages, busy, onSend, onRetry, onWord, langName }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto bg-background">
        <div className="divide-y divide-border">
          {messages.map((m, i) => (
            <div key={i} className="px-5 py-4">
              <MessageBubble msg={m} onWord={onWord} onRetry={onRetry} />
            </div>
          ))}
        </div>
        <div ref={endRef} />
      </div>
      <Composer onSend={onSend} disabled={busy} langName={langName} />
    </div>
  );
}
