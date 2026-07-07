"""
Layer 1: generation. The LLM plays a conversation partner in the TARGET LANGUAGE
(passed per request; not hardcoded). Two entry points: generate() (blocking,
with retry) and generate_stream() (yields reasoning + content deltas for the
live "thinking" UI).

Reads BOTH content and reasoning_content, because reasoning models often leave
the real reply in the reasoning channel.
"""
import languages
from config import PROVIDER, DEFAULT_LANG
from llm.client import get_client

SYSTEM = ("You are {persona}\n"
          "You are having a conversation in {language} with a language learner.\n"
          "- Reply ONLY in {language}.\n"
          "- Level CEFR {level}: keep words simple, but be a real conversation partner.\n"
          "- The topic is: {topic}. Stay roughly on it.\n"
          "- Stay fully in character as described above, while keeping the language at the learner's level.\n"
          "- Write 2-3 sentences: react to what they said, add a small detail or opinion, "
          "then ask ONE follow-up question. Show interest, don't interrogate.\n"
          "- Vary your sentences. Where natural, use everyday connecting words and a mix of tenses.\n"
          "{targets_line}"
          "- Do NOT translate or explain grammar. Do NOT show your reasoning. "
          "Just reply naturally in {language}.")

DEFAULT_PERSONA_TEXT = "a warm, curious conversation partner."

ARTICLE_BLOCK = (
    "\n\nThe learner wants to discuss this article. Base the conversation on "
    "it: react to it, share a simple opinion, and ask what they think.\n"
    "--- ARTICLE\nTitle: {title}\n{text}\n--- END ARTICLE")


def build_system(level, topic, persona=None, article=None, targets=None, lang=None):
    persona = (persona or DEFAULT_PERSONA_TEXT).strip()
    language = languages.name_of(lang or DEFAULT_LANG)
    targets_line = ""
    if targets:
        words = ", ".join(str(w) for w in targets[:16])
        targets_line = (f"- Where natural, prefer these words the learner studies: "
                        f"{words}. Never force them.\n")
    sys = SYSTEM.format(level=level, topic=topic, persona=persona,
                        targets_line=targets_line, language=language)
    if article and (article.get("text") or "").strip():
        sys += ARTICLE_BLOCK.format(title=article.get("title") or "(untitled)",
                                    text=article["text"])
    return sys


def _looks_like_junk(line, target_is_english=False):
    """A real reply is a short sentence in the target language, not reasoning
    debris. The English-keyword heuristic is skipped when the target IS English."""
    l = line.strip()
    if not l:
        return True
    if l[:2] in ("**", "* ", "- ", "# ") or l[:3].strip().rstrip(".").isdigit():
        return True
    if l.startswith(("Thinking", "Step", "Note:", "Answer:", "Reply:")):
        return True
    if not target_is_english:
        english = {"the", "check", "should", "would", "user", "constraint", "constraints",
                   "response", "process", "step", "first", "because", "however"}
        words = [w.strip(".,:*!?").lower() for w in l.split()]
        if words and sum(w in english for w in words) / len(words) > 0.25:
            return True
    return False


def clean_reply(msg, target_is_english=False):
    """Pull the actual target-language reply out of a (possibly reasoning) message."""
    text = (getattr(msg, "content", None) or "").strip()
    if text and not _looks_like_junk(text, target_is_english):
        return text
    rc = (getattr(msg, "reasoning_content", None) or "").strip()
    if rc:
        for line in reversed([l.strip() for l in rc.splitlines() if l.strip()]):
            if not _looks_like_junk(line, target_is_english):
                return line
    return ""


def generate(history, level, topic="daily life", provider=None, model=None, temperature=0.7,
             nudge=False, persona=None, article=None, targets=None, lang=None):
    client, model = get_client(provider, model)
    language = languages.name_of(lang or DEFAULT_LANG)
    target_is_english = languages.normalize(lang) == "en"
    sys = build_system(level, topic, persona, article, targets, lang)
    if nudge:
        sys += (f"\nIMPORTANT: Output ONLY the {language} reply text. No thinking, no lists, "
                f"no other languages. Just 1-2 short {language} sentences.")
    msgs = [{"role": "system", "content": sys}] + history
    resp = client.chat.completions.create(model=model, messages=msgs,
        temperature=temperature, max_tokens=800 if nudge else 500)
    msg = resp.choices[0].message
    fr = resp.choices[0].finish_reason
    content = (getattr(msg, "content", None) or "")
    reasoning = (getattr(msg, "reasoning_content", None) or "")
    cleaned = clean_reply(msg, target_is_english)
    print("\n" + "=" * 60)
    print(f"[MODEL] provider={provider or PROVIDER}  model={model}  lang={languages.normalize(lang)}  finish_reason={fr}  nudge={nudge}")
    print(f"[CONTENT]  {content!r}")
    if reasoning:
        print(f"[REASONING]  {reasoning[:400]!r}{'…' if len(reasoning) > 400 else ''}")
    print(f"[CLEANED -> shown to user]  {cleaned!r}")
    print("=" * 60 + "\n", flush=True)
    return cleaned


def generate_stream(history, level, topic="daily life", provider=None, model=None, temperature=0.7,
                    persona=None, article=None, targets=None, lang=None):
    """Yield ('reasoning', delta) / ('content', delta) tuples live, then ('final', full)."""
    client, model = get_client(provider, model)
    target_is_english = languages.normalize(lang) == "en"
    sys = build_system(level, topic, persona, article, targets, lang)
    msgs = [{"role": "system", "content": sys}] + history
    content_acc = ""
    reasoning_acc = ""
    stream = client.chat.completions.create(model=model, messages=msgs,
        temperature=temperature, max_tokens=800, stream=True)
    for chunk in stream:
        delta = chunk.choices[0].delta if chunk.choices else None
        if not delta:
            continue
        rc = getattr(delta, "reasoning_content", None)
        if rc:
            reasoning_acc += rc
            yield ("reasoning", rc)
        c = getattr(delta, "content", None)
        if c:
            content_acc += c
            yield ("content", c)
    final = content_acc.strip()
    if not final and reasoning_acc.strip():
        for line in reversed([l.strip() for l in reasoning_acc.splitlines() if l.strip()]):
            if not _looks_like_junk(line, target_is_english):
                final = line
                break
    print("\n" + "=" * 60)
    print(f"[STREAM] provider={provider or PROVIDER} model={model} lang={languages.normalize(lang)}")
    print(f"[STREAM-CONTENT]  {content_acc[:200]!r}")
    if reasoning_acc:
        print(f"[STREAM-REASONING] {reasoning_acc[:200]!r}{'…' if len(reasoning_acc) > 200 else ''}")
    print("=" * 60 + "\n", flush=True)
    yield ("final", final)
