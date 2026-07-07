"""
The correction of the learner's own sentence — the one place we accept LLM
judgement, since correcting free-form text can't be done deterministically. The
target language is passed per request. The prompt is grounded in the
deterministic spaCy parse (lemmas, POS, morphology, detected grammar) for the
learner's language, which improves accuracy regardless of the model.

Parses BOTH content and reasoning_content, so reasoning models whose answer
lands in the thinking channel still work. Captures the reasoning as `why`.
"""
import re
from collections import Counter

import languages
from config import PROVIDER, DEFAULT_LANG
from llm.client import get_client
from llm.generate import clean_reply
from nlp.analyze import analyze
from nlp.grammar import detect_grammar

CORRECT_SYS = (
    "You are a {language} teacher. The student wrote a sentence in {language}. "
    "Correct ALL errors: spelling, grammar, word order, and naturalness.\n"
    "A deterministic parser has already analysed the sentence; its output is "
    "given to help you (lemmas, part-of-speech, morphology, detected grammar). "
    "Trust the parser for word identity and structure; use it to spot the real "
    "errors rather than guessing.\n"
    "Respond in EXACTLY this format, nothing else:\n"
    "CORRECTED: <the fully corrected {language} sentence>\n"
    "CHANGES: <one short English clause per fix, separated by ' | '; "
    "or 'none' if the sentence was already correct>\n"
    "Do not add commentary. Do not translate. Keep the student's meaning."
)


def _analysis_hint(text, lang):
    """Compact, deterministic parse summary passed to the correction model."""
    toks = analyze(text, lang)
    parts = []
    for t in toks:
        if not t["is_word"]:
            continue
        bit = f"{t['surface']}"
        meta = []
        if t.get("pos"):
            meta.append(t["pos"])
        if t.get("lemma") and t["lemma"] != t["surface"].lower():
            meta.append(f"lemma={t['lemma']}")
        if t.get("morph"):
            meta.append(t["morph"])
        if meta:
            bit += f" ({'; '.join(meta)})"
        parts.append(bit)
    gram = detect_grammar(toks, lang=lang)
    lines = ["Parser analysis:", "  tokens: " + ", ".join(parts)]
    if gram.get("all"):
        lines.append("  constructions: " + ", ".join(c["name"] for c in gram["all"]))
    return "\n".join(lines)


def _parse_correction(blob):
    """Pull CORRECTED:/CHANGES: out of a text blob. (corrected|None, changes)."""
    if not blob:
        return None, []
    corrected = None
    changes = []
    for line in blob.splitlines():
        s = line.strip().lstrip("*-• ").strip()
        up = s.upper()
        if up.startswith("CORRECTED:"):
            val = s.split(":", 1)[1].strip().strip('"')
            if val:
                corrected = val
        elif up.startswith("CHANGES:"):
            body = s.split(":", 1)[1].strip()
            if body and body.lower() != "none":
                changes = [c.strip() for c in re.split(r"\||;|\n", body) if c.strip()]
    return corrected, changes


def _word_signature(text, lang):
    """Stable word list for comparing meaning-preserving edits."""
    words = []
    for token in analyze(text, lang):
        if not token["is_word"]:
            continue
        words.append((token.get("lemma") or token["surface"].lower()).strip())
    return words


def _has_word_reordering(original, corrected, lang):
    """True only when shared words appear in a different relative order."""
    original_words = _word_signature(original, lang)
    corrected_words = _word_signature(corrected, lang)
    if not original_words or not corrected_words:
        return False

    shared_counts = Counter(original_words) & Counter(corrected_words)
    if not shared_counts:
        return False

    def keep_shared(words):
        seen = Counter()
        kept = []
        for word in words:
            if seen[word] >= shared_counts[word]:
                continue
            seen[word] += 1
            kept.append(f"{word}#{seen[word]}")
        return kept

    return keep_shared(original_words) != keep_shared(corrected_words)


def _normalize_changes(original, corrected, changes, lang):
    """Drop misleading fix labels that the sentence diff doesn't support."""
    if not changes:
        return changes

    has_reordering = _has_word_reordering(original, corrected, lang)
    normalized = []
    for change in changes:
        label = change.strip()
        if not label:
            continue
        lower = label.lower()
        if "word order" in lower and not has_reordering:
            continue
        normalized.append(label)
    return normalized


def correct_text(text, provider=None, model=None, lang=None):
    """Return {'corrected','changes','clean','why'}. Best-effort (LLM), grounded
    in the deterministic spaCy parse for the learner's language."""
    if not text.strip():
        return {"corrected": text, "changes": [], "clean": True, "why": ""}
    client, model = get_client(provider, model)
    language = languages.name_of(lang or DEFAULT_LANG)
    target_is_english = languages.normalize(lang) == "en"
    sys = CORRECT_SYS.format(language=language)
    user_msg = f"{text}\n\n{_analysis_hint(text, lang)}"
    resp = client.chat.completions.create(model=model, temperature=0.2, max_tokens=900,
        messages=[{"role": "system", "content": sys},
                  {"role": "user", "content": user_msg}])
    msg = resp.choices[0].message
    content = (getattr(msg, "content", None) or "")
    reasoning = (getattr(msg, "reasoning_content", None) or "")
    corrected, changes = _parse_correction(content)
    if corrected is None:
        corrected, changes = _parse_correction(reasoning)
    if corrected is None:  # bare corrected sentence, no labels
        salvage = clean_reply(msg, target_is_english)
        if salvage and salvage.strip().lower() != text.strip().lower() and "\n" not in salvage.strip():
            corrected, changes = salvage.strip(), []
    if corrected is None:
        corrected, changes = text, []
    changes = _normalize_changes(text, corrected, changes, lang)
    clean = (not changes) and (corrected.strip().lower() == text.strip().lower())
    why = reasoning.strip()[:600] if reasoning.strip() else ""
    print("\n" + "=" * 60)
    print(f"[CORRECT] provider={provider or PROVIDER} model={model} lang={languages.normalize(lang)}")
    print(f"[CORRECT-RESULT]    in={text!r} -> {corrected!r} changes={changes} clean={clean}")
    print("=" * 60 + "\n", flush=True)
    return {"corrected": corrected, "changes": changes, "clean": clean, "why": why}
