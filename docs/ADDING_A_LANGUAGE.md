# Adding a language

Everything about a language is looked up, per request, from one registry. Adding a
language is a **backend-only** change and comes in three sizes depending on how much
grammar depth you want.

- **Minimum (5 minutes):** one registry line + one spaCy model → the language works
  with the generic grammar engine.
- **No model available?** Still add the registry line — the language runs in
  morphology-only fallback until a model is installed.
- **First-class (optional):** author a hand-tuned grammar module for nuanced,
  language-specific constructions.

The frontend needs **no** changes: it discovers languages, names, and capabilities
from `GET /api/meta`. Unknown flag? It falls back to a globe icon.

---

## Step 1 — Add a registry entry

Edit `backend/languages.py` and add one line to `LANGUAGES`, keyed by the language's
ISO 639-1 code:

```python
"cs": {"name": "Czech", "spacy": "cs_core_news_sm", "wordfreq": "cs", "dictionary": "cs", "grammar": "generic"},
```

| Field | What it is | Notes |
|---|---|---|
| `name` | Display name shown in the UI | |
| `spacy` | spaCy pipeline **package name** | See <https://spacy.io/models>. Use `None` if spaCy has no model — the language still works in regex/morphology fallback. |
| `wordfreq` | Language code for the `wordfreq` library | Usually identical to the key. Check the [`wordfreq` language list](https://pypi.org/project/wordfreq/). |
| `dictionary` | Language code for the Wiktionary-backed dictionary API | Usually the key, but some collapse to a macrolanguage (e.g. Norwegian Bokmål `nb` uses `"no"`). |
| `grammar` | `"generic"`, or `"nl"` / `"de"` (or your own key) | `"generic"` uses the cross-language engine. Point it at a dedicated module for first-class grammar (Step 3). |

That's it for the minimum. Region tags and casing are handled for you — `CS`, `cs-CZ`,
and `cs_CZ` all normalise to `cs`.

## Step 2 — Install the spaCy model

```bash
cd backend
source .venv/bin/activate
python -m spacy download cs_core_news_sm
```

Or add it to the default set installed by `setup.sh`:

```bash
WOORDJE_SPACY_MODELS="nl_core_news_sm en_core_web_sm de_core_news_sm cs_core_news_sm" ./setup.sh
```

Verify it's picked up — the language should report `spacy: true` and a `grammar` level
of `generic` (not `morphology`):

```bash
curl -s localhost:5001/api/health          # cs should appear in installedLanguages
curl -s localhost:5001/api/meta | grep -A6 '"code": "cs"'
```

You now have a working language: lemmas, POS, morphology, frequency ranking, dictionary
lookups, and generic grammar (perfect/past/future tense, comparative/superlative,
subordinate clauses, negation, passive, imperative, and questions) — all detected from
Universal-Dependencies features that every spaCy model emits.

## Step 3 — (Optional) First-class grammar

The generic engine is solid for common constructions but language-neutral. To give a
language hand-tuned, nuanced constructions (the way Dutch and German are done):

1. **Copy the generic module** as a starting point:

   ```bash
   cp backend/nlp/grammar/rules/generic.py backend/nlp/grammar/rules/cs.py
   ```

2. **Register it.** In `languages.py`, set the language's `grammar` to your new key and
   add that key to the first-class set near the top of the file:

   ```python
   # in LANGUAGES:
   "cs": {..., "grammar": "cs"},

   # near the top:
   _FIRST_CLASS_GRAMMAR = {"nl", "de", "cs"}
   ```

3. **Write the rules.** A grammar module exports exactly three things:

   ```python
   # id -> (display name, one-line explanation, an example sentence)
   RULE_LIBRARY = {
       "past_tense": ("Past tense", "A simple past verb form.", "..."),
       # ...
   }

   # id -> {"prio": int, "minlevel": "A1".."C1"}
   #   prio     = which construction is "primary" when several are present (higher wins)
   #   minlevel = the earliest CEFR level at which it's surfaced as teachable
   CONSTRUCTION_META = {
       "past_tense": {"prio": 60, "minlevel": "A1"},
       # ...
   }

   def detect(tokens):
       """Return a set of construction ids present in the sentence."""
       found = set()
       # ... your detection logic ...
       return found
   ```

   Each item in `tokens` is the analyzer's token dict:

   ```python
   {
     "surface": "gegeten",     # the word as written
     "lemma":   "eten",        # base form (spaCy)
     "pos":     "verb",        # coarse part of speech
     "upos":    "VERB",        # Universal POS tag
     "dep":     "..",          # dependency relation
     "morph":   "VerbForm=Part|Tense=Past",  # Universal-Dependencies feature string
     "is_word": True,          # False for punctuation
   }
   ```

   Look at `rules/nl.py` and `rules/de.py` for worked examples that combine UD features
   with language-specific cues (separable prefixes, V2 word order, modal + infinitive,
   reflexive pronouns, etc.).

The dispatcher (`nlp/grammar/__init__.py`) wires everything up automatically from the
registry — you never edit it. `build_result(...)` turns your detected ids into the
`{primary, all}` shape the API returns, so you only write `detect()` plus the two
tables.

## Step 4 — Test it

Add a case to `backend/tests/test_deterministic.py` (the grammar-dispatch test is a good
template) and run:

```bash
cd backend
pytest -q
```

The existing tests run offline and don't require a model, so they'll pass in CI even
before the spaCy model is installed on the runner.

## Optional polish

- **Flag emoji.** Add your code to `LANG_FLAGS` in
  `frontend/src/config/languages.js` (otherwise it shows 🌐).
- **Seed vocabulary.** Add a short starter list to `SEEDS` in
  `frontend/src/config/seeds.js` (otherwise the language starts with an empty list).

Neither is required for the language to work.
