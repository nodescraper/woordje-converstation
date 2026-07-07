# Contributing

Thanks for taking a look. This is a small, readable codebase — contributions that keep
it that way are very welcome.

## Project layout

- `backend/` — a stateless Flask API (generation + deterministic NLP). Start at
  `app.py` for the routes and `languages.py` for the language registry.
- `frontend/` — a React + Vite app. Start at `src/App.jsx`.

See the [README](README.md) for the architecture and the reasoning behind the
stateless-backend / client-owns-state split.

## Development setup

```bash
./setup.sh              # venv + Python deps + default spaCy models + npm install
./run-backend.sh       # http://localhost:5001   (API + Swagger UI at /api/docs)
./run-frontend.sh      # http://localhost:5173
```

You don't need a language model to work on most things — the API, annotation, and UI
all run without one. You only need a model (LM Studio locally, or a cloud key in
`backend/.env`) to exercise actual generation and correction.

## Running the checks

Everything CI runs, you can run locally:

```bash
# backend tests (offline; no model / no spaCy model required)
cd backend && pip install -r requirements-dev.txt && pytest -q

# frontend production build (this is the type/parse check)
cd frontend && npm ci && npm run build
```

Please make sure both pass before opening a PR.

## Conventions

- **Python:** standard library + the few deps already in `requirements.txt`. Keep the
  backend importable and testable **without** a model or network — new deterministic
  code should degrade gracefully (look at how `nlp/analyze.py` falls back when spaCy is
  missing) and get a test in `backend/tests/`.
- **JavaScript/React:** functional components and hooks; styling via Tailwind and the
  small `components/ui` primitives; use the `@/` import alias. No new heavy runtime
  dependencies without a good reason.
- **No product data in the backend.** Vocabulary, personas, topics, and settings live
  in the client and are passed per request. Keep it that way.
- **No hard-coded language.** Anything language-specific goes through
  `backend/languages.py` (and, for grammar, a `nlp/grammar/rules/` module). See below.

## Adding a language

This is the most common contribution and is designed to be easy — often a single
registry line plus a spaCy model. Follow
**[docs/ADDING_A_LANGUAGE.md](docs/ADDING_A_LANGUAGE.md)**.

## Pull requests

1. Fork and branch from `main`.
2. Keep changes focused; describe the what and the why.
3. Make sure the checks above pass.
4. For anything user-facing, a screenshot or a short clip helps.

## Reporting bugs / ideas

Open an issue with steps to reproduce (and, for the backend, the relevant part of
`GET /api/meta` so we know which capability level you were on).
