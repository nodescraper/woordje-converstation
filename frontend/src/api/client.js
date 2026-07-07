// Single place that talks to the chat-generation backend.
// Everything product-related (vocab, persona, topic, LANGUAGE) is passed IN by
// callers — the backend is stateless.
const API_BASE = import.meta.env.VITE_API_BASE || "";

async function postJSON(path, body) {
  const res = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function getMeta() {
  return fetch(API_BASE + "/api/meta").then((r) => r.json());
}

export function analyzeText({ text, level, vocab, provider, model, lang, correct = true }) {
  return postJSON("/api/analyze", { text, level, vocab, provider, model, lang, correct });
}

export function fetchWord({ lemma, lang, online = true }) {
  return postJSON("/api/word", { lemma, lang, online });
}

export function fetchArticle(url) {
  return postJSON("/api/article", { url });
}

// Streaming turn. onEvent receives {type, delta?, annotated?, used?, error?}.
// `payload` should already include `lang` (see useChat).
export async function streamTurn(payload, onEvent, signal) {
  const res = await fetch(API_BASE + "/api/turn_stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok || !res.body) throw new Error("stream failed");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop();
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      onEvent(JSON.parse(line.slice(5).trim()));
    }
  }
}
