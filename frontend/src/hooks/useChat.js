import { useState, useRef, useCallback } from "react";
import { streamTurn, analyzeText } from "@/api/client";

// Message shapes:
//   { role:"user", text, analysis? , correction? }
//   { role:"bot",  annotated, thinking, replyTo }
//   { role:"error", text, retryable }
export function useChat({ lang, level, topic, persona, provider, model, vocab, targets, article }) {
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const histRef = useRef([]); // raw {role, content} for the backend

  const ctx = () => ({
    lang,
    level,
    topic,
    provider,
    model,
    persona: persona?.prompt || null,
    vocab,
    targets,
    article: article || null,
  });

  const runBotTurn = useCallback(
    async (replyTo) => {
      setBusy(true);
      let thinking = "";
      let content = "";
      const botMsg = { role: "bot", annotated: null, thinking: "", replyTo, streaming: true, live: "" };
      setMessages((m) => [...m, botMsg]);
      const update = (patch) =>
        setMessages((m) => {
          const copy = [...m];
          // find last bot streaming message
          for (let k = copy.length - 1; k >= 0; k--) {
            if (copy[k].role === "bot" && copy[k].streaming) {
              copy[k] = { ...copy[k], ...patch };
              break;
            }
          }
          return copy;
        });

      try {
        await streamTurn(
          { history: histRef.current, ...ctx() },
          (ev) => {
            if (ev.type === "reasoning") {
              thinking += ev.delta;
              update({ thinking });
            } else if (ev.type === "content") {
              content += ev.delta;
              update({ live: content });
            } else if (ev.type === "error") {
              setMessages((m) => m.filter((x) => x !== botMsg && !(x.role === "bot" && x.streaming)));
              setMessages((m) => [...m, { role: "error", text: ev.error, retryable: ev.retryable }]);
            } else if (ev.type === "done") {
              histRef.current = [
                ...histRef.current,
                { role: "assistant", content: ev.annotated.text },
              ];
              update({ annotated: ev.annotated, thinking, streaming: false, used: ev.used });
            }
          }
        );
      } catch (e) {
        setMessages((m) => m.filter((x) => !(x.role === "bot" && x.streaming)));
        setMessages((m) => [
          ...m,
          { role: "error", text: "Network error reaching the server. Is the backend running?", retryable: true },
        ]);
      }
      setBusy(false);
    },
    [messages.length, lang, level, topic, persona, provider, model, vocab, targets, article]
  );

  const send = useCallback(
    async (text) => {
      const v = text.trim();
      if (!v) return;
      const userMsg = { role: "user", text: v, correction: null, analysis: null, loading: true };
      setMessages((m) => [...m, userMsg]);
      histRef.current = [...histRef.current, { role: "user", content: v }];

      // analysis + correction in parallel with the reply
      analyzeText({ text: v, level, vocab, provider, model, lang, correct: true })
        .then((a) =>
          setMessages((m) =>
            m.map((x) =>
              x === userMsg
                ? { ...x, analysis: a.annotated, correction: a.correction, loading: false }
                : x
            )
          )
        )
        .catch(() =>
          setMessages((m) => m.map((x) => (x === userMsg ? { ...x, loading: false } : x)))
        );

      await runBotTurn(v);
    },
    [runBotTurn, lang, level, vocab, provider, model]
  );

  const start = useCallback(
    (force = false) => {
      if (force || histRef.current.length === 0) runBotTurn(null);
    },
    [runBotTurn]
  );

  const retry = useCallback(() => {
    setMessages((m) => m.filter((x) => x.role !== "error"));
    runBotTurn(null);
  }, [runBotTurn]);

  const reset = useCallback(() => {
    histRef.current = [];
    setMessages([]);
    setBusy(false);
  }, []);

  return { messages, busy, send, start, retry, reset };
}
