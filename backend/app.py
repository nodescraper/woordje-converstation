#!/usr/bin/env python3
"""
woordje conversation — chat-generation API (stateless, multi-language).

This backend is a PURE GENERATION + DETERMINISTIC-ANNOTATION SERVICE. It stores
no product data — no vocab, no personalities, no topics, no settings. The client
(this project's React frontend, or the woordje app) owns all of that and passes
what's needed with each request, including the TARGET LANGUAGE. That's what makes
the API reusable across clients and languages.

Responsibilities:
  - LLM generation (blocking + streaming, with the live "thinking" channel)
  - deterministic annotation (spaCy + wordfreq + grammar) in the request's
    language, over a vocab the CLIENT supplies per request
  - correction of the learner's sentence, grounded in the spaCy parse
  - fetching + extracting an article to talk about (language-agnostic)

Interactive API docs / tester:  http://localhost:5001/api/docs  (Swagger UI)
Run:                            python app.py  ->  http://localhost:5001
"""
import json
import os
from flask import Flask, request, jsonify, Response, redirect

import languages
from config import (PROVIDER, PROVIDERS, PROVIDER_LABELS, HIDDEN_UNLESS_CONFIGURED,
                    PORT, DEBUG, DEFAULT_LANG)
from nlp.analyze import (approx_rank, SPACY_OK, WORDFREQ_OK,
                         spacy_model_installed, wordfreq_supports)
from nlp.annotate import annotate
from nlp.dictionary import fetch_meaning
from nlp.article import fetch_article, ARTICLE_OK
from llm.client import provider_available, list_provider_models, is_local_provider
from llm.generate import generate, generate_stream
from llm.correct import correct_text

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__)


# CORS — the frontend runs on its own origin (Vite dev server, or a static host).
@app.after_request
def add_cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return resp


@app.route("/api/<path:_any>", methods=["OPTIONS"])
def cors_preflight(_any):
    return ("", 204)


def _req_lang(d):
    """Resolve the target language for a request body, defaulting sensibly."""
    return languages.normalize(d.get("lang") or DEFAULT_LANG)


# ============================ meta / capabilities =========================
@app.route("/api/meta")
def meta():
    """What the backend can do: reachable models + supported languages with
    per-language capability flags. NO product data."""
    provs = []
    for k in PROVIDERS:
        available = provider_available(k)
        if k in HIDDEN_UNLESS_CONFIGURED and not PROVIDERS[k]["api_key"] and not available:
            continue
        models = list_provider_models(k) if is_local_provider(k) else [PROVIDERS[k]["model"]]
        provs.append({
            "key": k,
            "label": PROVIDER_LABELS.get(k, k),
            "model": PROVIDERS[k]["model"],
            "models": models,
            "local": is_local_provider(k),
            "available": available,
        })

    langs = []
    for code in languages.all_codes():
        entry = languages.get(code)
        model_ok = spacy_model_installed(code)
        rules = languages.grammar_key(code)
        langs.append({
            "code": code,
            "name": entry["name"],
            "spacy": model_ok,                       # is the spaCy model installed?
            "spacyModel": entry.get("spacy"),
            "wordfreq": wordfreq_supports(code),
            "dictionary": True,                      # keyless web API, assume reachable
            # what grammar the learner gets: full (hand-tuned) / generic (UD) / morphology-only
            "grammar": ("morphology" if not model_ok else ("full" if rules in ("nl", "de") else "generic")),
            "ruleset": rules,
        })

    default_provider = PROVIDER if PROVIDER in PROVIDERS else next(iter(PROVIDERS))
    default_model = PROVIDERS[default_provider]["model"]
    default_provider_models = next((p["models"] for p in provs if p["key"] == default_provider), [])
    if default_provider_models and default_model not in default_provider_models:
        default_model = default_provider_models[0]

    return jsonify({"spacy": SPACY_OK, "wordfreq": WORDFREQ_OK, "article": ARTICLE_OK,
                    "providers": provs, "defaultProvider": default_provider, "defaultModel": default_model,
                    "languages": langs, "defaultLang": DEFAULT_LANG})


@app.route("/api/health")
def health():
    """Liveness + a compact capability summary (handy for uptime checks/CI)."""
    installed = [c for c in languages.all_codes() if spacy_model_installed(c)]
    return jsonify({"ok": True, "spacy": SPACY_OK, "wordfreq": WORDFREQ_OK,
                    "article": ARTICLE_OK, "installedLanguages": installed,
                    "defaultLang": DEFAULT_LANG})


# ============================ conversation turn ===========================
@app.route("/api/turn", methods=["POST"])
def turn():
    """Blocking reply. Body: {history, level, topic, provider, persona, article,
    targets, vocab, lang}. Returns {ok, annotated, used, error?, retryable?}."""
    d = request.get_json(force=True)
    history = d.get("history", []); level = d.get("level", "A2")
    topic = d.get("topic", "daily life"); provider = d.get("provider") or PROVIDER
    model = d.get("model")
    persona = d.get("persona"); article = d.get("article")
    targets = d.get("targets"); vocab = d.get("vocab"); lang = _req_lang(d)
    used = _used_words(history, vocab, lang)
    convo = history or [{"role": "user", "content": "Hoi!"}]
    try:
        raw = ""
        for attempt in range(3):
            raw = generate(convo, level, topic, provider, model,
                           temperature=0.7 + 0.15 * attempt, nudge=(attempt > 0),
                           persona=persona, article=article, targets=targets, lang=lang)
            if raw.strip():
                break
        if not raw.strip():
            return jsonify({"ok": False, "retryable": True,
                "error": "The model kept returning an empty reply. Try again, or switch to a cleaner model.",
                "annotated": None, "used": used})
    except Exception:
        cfg = PROVIDERS.get(provider, {})
        return jsonify({"ok": False, "retryable": False,
            "error": f"Cannot reach {provider} ({cfg.get('base_url', '?')}). Pick another model, or check the server/key.",
            "annotated": None, "used": used})
    return jsonify({"ok": True, "error": None, "annotated": annotate(raw, level, vocab, lang), "used": used})


@app.route("/api/turn_stream", methods=["POST"])
def turn_stream():
    """Streaming reply (SSE): reasoning/content deltas, then done.
    Body: {history, level, topic, provider, persona, article, targets, vocab, lang}."""
    d = request.get_json(force=True)
    history = d.get("history", []); level = d.get("level", "A2")
    topic = d.get("topic", "daily life"); provider = d.get("provider") or PROVIDER
    model = d.get("model")
    persona = d.get("persona"); article = d.get("article")
    targets = d.get("targets"); vocab = d.get("vocab"); lang = _req_lang(d)
    used = _used_words(history, vocab, lang)
    convo = history or [{"role": "user", "content": "Hoi!"}]

    def sse(obj):
        return f"data: {json.dumps(obj)}\n\n"

    def gen():
        final = ""
        try:
            for kind, payload in generate_stream(convo, level, topic, provider, model,
                                                 persona=persona, article=article,
                                                 targets=targets, lang=lang):
                if kind == "reasoning":
                    yield sse({"type": "reasoning", "delta": payload})
                elif kind == "content":
                    yield sse({"type": "content", "delta": payload})
                elif kind == "final":
                    final = payload
        except Exception as ex:
            cfg = PROVIDERS.get(provider, {})
            yield sse({"type": "error", "retryable": False,
                "error": f"Cannot reach {provider} ({cfg.get('base_url', '?')}). Pick another model, or check the server/key. [{type(ex).__name__}]"})
            return
        if not final.strip():
            yield sse({"type": "error", "retryable": True,
                "error": "The model returned an empty reply. Try again, or switch models."})
            return
        yield sse({"type": "done", "annotated": annotate(final, level, vocab, lang), "used": used})

    return Response(gen(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ============================ learner-message analysis ====================
@app.route("/api/analyze", methods=["POST"])
def analyze_user():
    """Deterministic annotation of the learner's message + a spaCy-grounded
    correction. Body: {text, level, provider, vocab, lang, correct?}."""
    d = request.get_json(force=True)
    text = d.get("text", "").strip(); level = d.get("level", "A2")
    provider = d.get("provider") or PROVIDER; model = d.get("model"); vocab = d.get("vocab"); lang = _req_lang(d)
    want_correction = d.get("correct", True)
    annotated = annotate(text, level, vocab, lang)
    correction = None
    if want_correction and text:
        try:
            correction = correct_text(text, provider, model, lang)
        except Exception as ex:
            correction = {"error": f"Correction unavailable ({type(ex).__name__})."}
    return jsonify({"annotated": annotated, "correction": correction})


# ============================ word detail =================================
@app.route("/api/word", methods=["POST"])
def word():
    """Meaning + frequency for one lemma. Body: {lemma, lang, online?}.
    Whether it's 'known' is the client's concern, not the backend's."""
    d = request.get_json(force=True); lemma = d.get("lemma", "").lower(); lang = _req_lang(d)
    m = fetch_meaning(lemma, lang, online=d.get("online", True))
    return jsonify({
        "lemma": lemma,
        "lang": lang,
        "meaning": m["tr"],
        "definition": m.get("definition"),
        "translations": m.get("translations", []),
        "examples": m.get("examples", []),
        "partOfSpeech": m.get("part_of_speech"),
        "pronunciation": m.get("pronunciation"),
        "rank": approx_rank(lemma, lang),
    })


# ============================ article fetch =======================
@app.route("/api/article", methods=["POST"])
def article():
    """Fetch + extract the main text of an article URL (Trafilatura). Body: {url}.
    Returns {ok, title, text, url, error?}. Language-agnostic."""
    d = request.get_json(force=True)
    url = (d.get("url") or "").strip()
    if not url:
        return jsonify({"ok": False, "error": "No URL provided."}), 400
    try:
        result = fetch_article(url)
        if not result.get("text"):
            return jsonify({"ok": False,
                "error": "Couldn't extract article text from that page. Try a direct article link."}), 422
        return jsonify({"ok": True, **result})
    except Exception as ex:
        return jsonify({"ok": False, "error": f"Fetch failed: {type(ex).__name__}."}), 500


# ============================ OpenAPI + Swagger UI ========================
@app.route("/api/openapi.yaml")
def openapi_spec():
    """Serve the OpenAPI spec (drives the Swagger UI tester)."""
    path = os.path.join(BASE_DIR, "openapi.yaml")
    with open(path, "r", encoding="utf-8") as f:
        return Response(f.read(), mimetype="application/yaml")


@app.route("/api/docs")
def swagger_ui():
    """Interactive API docs + tester (Swagger UI, loaded from CDN)."""
    return Response(_SWAGGER_HTML, mimetype="text/html")


@app.route("/")
def root():
    return redirect("/api/docs")


_SWAGGER_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>woordje conversation API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
  <style>body{margin:0} .topbar{display:none}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "/api/openapi.yaml",
      dom_id: "#swagger-ui",
      deepLinking: true,
      tryItOutEnabled: true,
      persistAuthorization: true
    });
  </script>
</body>
</html>"""


# ============================ helpers =====================================
def _used_words(history, vocab, lang):
    """Which of the learner's known words appeared in their last message.
    Purely informational (the client decides what to do with it)."""
    from nlp.annotate import _norm_vocab
    from nlp.analyze import analyze as _analyze
    known = _norm_vocab(vocab)
    if known and history and history[-1].get("role") == "user":
        toks = _analyze(history[-1]["content"], lang)
        return sorted(known & {t["lemma"] for t in toks})
    return []


if __name__ == "__main__":
    installed = [c for c in languages.all_codes() if spacy_model_installed(c)]
    print(f"woordje conversation API  ->  http://localhost:{PORT}")
    print(f"  interactive docs/tester ->  http://localhost:{PORT}/api/docs")
    print(f"  default language: {DEFAULT_LANG}  |  spaCy models installed: {installed or 'NONE (regex fallback)'}")
    print(f"  gates: spaCy={'on' if SPACY_OK else 'FALLBACK'}  "
          f"wordfreq={'on' if WORDFREQ_OK else 'FALLBACK'}  "
          f"article={'on' if ARTICLE_OK else 'OFF (pip install trafilatura)'}")
    app.run(port=PORT, debug=DEBUG)
