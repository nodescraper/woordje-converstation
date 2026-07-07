# woordje conversation

A small, language-agnostic **sandbox for experimenting with LLMs and deterministic
NLP together**. It's a chat partner you practise a foreign language with — but the
interesting part is the split of responsibilities:

- **Meaning** comes from a dictionary, **highlighting** from a frequency list,
  **grammar** from a real sentence parse, and **"known vs. new"** from your own word
  list.
- **The model only supplies the conversation.** Everything shown _about_ the words is
  computed by deterministic tools, not guessed by the LLM.

> The one place the model makes a judgement call is **correcting your own
> sentences** — and even that is grounded in the deterministic spaCy parse.

It ships with **Dutch and German fully tuned**, a **generic grammar engine** that
works for any language spaCy supports, and a one-file way to add more. It's meant to
be easy to read, easy to fork, and easy to point at a different model.

![license](https://img.shields.io/badge/license-MIT-blue)
![python](https://img.shields.io/badge/python-3.10%2B-3776AB)
![node](https://img.shields.io/badge/node-18%2B-339933)
![api-docs](https://img.shields.io/badge/API-OpenAPI%2FSwagger-85EA2D)

---

## Why this exists

Most "AI language tutors" let the model do everything — including inventing which
words are hard, what they mean, and whether your grammar was right. That's fun but
unreliable. This project is a testbed for the opposite approach: **use the LLM only
for what it's uniquely good at (open-ended conversation), and use deterministic tools
for everything factual.** The result is a clean place to swap models in and out,
compare them, and see exactly which layer produced which part of the output.

## Multi-language by design

Nothing about the language is hard-coded into the logic. A single registry
(`backend/languages.py`) declares each language and how its deterministic layers are
wired; every request carries a `lang`, and the frontend discovers what's available
from the API.

Each language has a **capability level** that the UI shows honestly:

| Level | What you get | When |
|---|---|---|
| **full** | Hand-tuned grammar ruleset + spaCy morphology + frequency | Dutch, German |
| **generic** | Cross-language grammar (Universal-Dependencies based) + spaCy + frequency | Any language whose spaCy model is installed |
| **morphology** | Regex tokenizer + morphology only | A language whose spaCy model isn't installed yet |

Everything **degrades gracefully** — a missing spaCy model or an offline dictionary
never breaks a request, it just lowers the capability level. `GET /api/meta` reports
the live level per language.

Adding a language is a backend-only change: see
**[docs/ADDING_A_LANGUAGE.md](docs/ADDING_A_LANGUAGE.md)**.

## Architecture

Two independent parts:

```
woordje-conversation/
├── backend/     Flask JSON API — STATELESS, multi-language generation + analysis
│   ├── app.py            routes (+ Swagger UI at /api/docs)
│   ├── languages.py      the language registry — EDIT THIS to add a language
│   ├── config.py         provider wiring (keys/models from env), no product data
│   ├── openapi.yaml      hand-written OpenAPI 3 spec (drives the tester)
│   ├── nlp/              spaCy · wordfreq · dictionary · article
│   │   └── grammar/      pluggable grammar: rules/nl.py, rules/de.py, rules/generic.py
│   ├── llm/              generation + correction
│   └── tests/           deterministic-layer tests (run offline, no model needed)
└── frontend/    React + Vite + Tailwind + shadcn/ui
    └── src/     api · config · store · hooks · components (incl. a Settings panel)
```

The **backend is a pure generation + annotation service** — it stores no vocabulary,
personas, topics, or settings. The **frontend owns all product data** (vocab per
language, personas, topics, chosen model; persisted in the browser) and passes what's
needed with each request, including the target language. That's what makes the same
API reusable across clients and languages.

## Prerequisites

- **Python 3.10+** and **Node 18+**
- **A language model.** Either:
  - **LM Studio** (or any OpenAI-compatible local server, e.g. Ollama) running locally
    with a model loaded — default endpoint `http://localhost:1234/v1`, fully local and
    free, **or**
  - a cloud key (DeepSeek / Gemini / any OpenAI-compatible endpoint) in `backend/.env`
    — see `backend/.env.example`.

Without a model the chat can't generate replies, but **everything else still works** —
the annotation, the word lookups, the article fetch, and the whole API surface.

## Quick start

The project now ships with a small local CLI, so you do not need to install and
run the frontend and backend independently anymore.

```bash
./woordje dev
```

That command:

- creates the backend virtual environment if it does not exist
- installs frontend dependencies if they are missing
- starts the Flask API on `http://localhost:5001`
- starts the Vite frontend on `http://localhost:5173`

The frontend proxies `/api` to the backend in dev, so no extra config is needed.

## CLI

The root CLI is available as `./woordje`, and the same commands also work through
`npm run ...`.

```bash
./woordje dev        # bootstrap missing deps and run backend + frontend
./woordje setup      # full install, including default spaCy models
./woordje backend    # run only the backend
./woordje frontend   # run only the frontend
./woordje help
```

Equivalent npm commands:

```bash
npm run dev
npm run setup
npm run backend
npm run frontend
```

`./woordje setup` is still useful when you want the full tuned deterministic
experience immediately, because it also installs the default spaCy models for
**Dutch, English, and German**.

To install a different model set during setup, pass `WOORDJE_SPACY_MODELS`:

```bash
WOORDJE_SPACY_MODELS="nl_core_news_sm fr_core_news_sm es_core_news_sm" ./woordje setup
```

## Try the API without the UI

The backend serves interactive docs and a request tester:

```
http://localhost:5001/api/docs         # Swagger UI — "Try it out" on every endpoint
http://localhost:5001/api/openapi.yaml # the raw OpenAPI 3 spec
http://localhost:5001/api/health       # liveness + capability summary
```

## Configuration

- **Models** — presets live in `backend/config.py` (`PROVIDERS`); every base URL, key,
  and model name is overridable by an env var. There's a generic `openai-compatible`
  slot for anything that speaks the OpenAI API (Ollama, vLLM, OpenRouter, …) — set
  `OPENAI_COMPAT_*` in `.env` and it appears as a selectable model.
- **Default language** — `WOORDJE_DEFAULT_LANG` (defaults to `nl`).
- **Default model** — `WOORDJE_DEFAULT_PROVIDER`.
- **Secrets** — cloud keys go in `backend/.env` (copy from `.env.example`). Never committed.
- **Frontend API base** — set `VITE_API_BASE` in `frontend/.env` only if hosting the
  frontend separately from the backend.

Language, model, custom topic, and advanced session instructions can all be changed
from the in-app setup flow.

## API (stateless)

Base `http://localhost:5001`. Everything product-related — including `lang` — is passed
IN per request.

| Endpoint | Purpose |
|---|---|
| `GET /api/meta` | capabilities: available models + per-language support flags |
| `GET /api/health` | liveness + a compact capability summary |
| `POST /api/turn` | blocking reply — body carries `history, level, topic, persona, targets, vocab, article, provider, lang` |
| `POST /api/turn_stream` | same, streamed (SSE: `reasoning` / `content` / `done`) |
| `POST /api/analyze` | deterministic annotation of the learner's message + grounded correction |
| `POST /api/word` | dictionary meaning + frequency for one word |
| `POST /api/article` | fetch + extract a news URL (Trafilatura) to talk about |

Example:

```bash
curl -s localhost:5001/api/turn -H 'Content-Type: application/json' -d '{
  "lang":"de",
  "history":[{"role":"user","content":"Hallo!"}],
  "level":"A2","persona":"a friendly barista in a café.",
  "vocab":["buch","haus","gehen"],"targets":["buch","gehen"],
  "provider":"lmstudio-qwen"
}'
```

## Testing

The deterministic layers are covered by tests that run **offline, with no model and no
spaCy model installed** (they exercise the graceful-fallback paths, the registry, and
the grammar dispatcher):

```bash
npm run test
```

CI runs these plus a frontend production build on every push
(`.github/workflows/ci.yml`).

## Adding a language

1. Add an entry to `backend/languages.py`.
2. `python -m spacy download <model>` for that language.
3. (Optional) author a hand-tuned grammar module in `backend/nlp/grammar/rules/`.

Full walkthrough: **[docs/ADDING_A_LANGUAGE.md](docs/ADDING_A_LANGUAGE.md)**.

## Notes & limitations

- **Correction quality tracks the model** — small local models are shakier; a capable
  model gives the best corrections. The spaCy grounding helps either way.
- **Grammar depth depends on the language** — Dutch and German get hand-tuned rules;
  other languages get the generic Universal-Dependencies engine, which is solid for
  common constructions but less nuanced.
- **spaCy morphology** is roughly 95% accurate on well-formed input.
- **Article fetching** needs internet and works best on direct article links;
  paywalled or JS-heavy pages may not extract.

## License

MIT © Balázs Csutar — see [LICENSE](LICENSE).
