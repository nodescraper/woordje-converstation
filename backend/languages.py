"""
Language registry — the single source of truth for which languages this sandbox
can work with, and how each deterministic layer is wired for them.

This is the file you edit to add a language. Nothing else in the backend hard-
codes a language: the spaCy model, the frequency code, the dictionary code and
the grammar rule-set are all looked up here, per request, by ISO code.

Each entry:
    name        human-readable name shown in the UI
    spacy       spaCy pipeline package (see https://spacy.io/models). None => the
                language falls back to regex tokenisation (no lemma/POS/morph).
    wordfreq    language code for the `wordfreq` library (usually == the key)
    dictionary  language code for the Wiktionary-backed dictionary API
    grammar     which construction rule-set to use: "nl", "de", or "generic".
                "generic" = Universal-Dependencies rules that hold across many
                languages (tense, comparison, questions, negation). Author a
                dedicated module under nlp/grammar/rules/<code>.py and point
                here to give a language first-class, hand-tuned constructions.

Capability at *runtime* (is the spaCy model actually installed? is wordfreq
importable?) is resolved lazily in nlp/analyze.py and reported by /api/meta.
"""

# Grammar rule-sets that ship as dedicated, hand-authored modules. Everything
# else uses "generic".
_FIRST_CLASS_GRAMMAR = {"nl", "de"}

# Default target language when a request omits one or sends garbage. config.py
# may override this from WOORDJE_DEFAULT_LANG (the only env-reading module).
DEFAULT_LANG = "nl"

LANGUAGES = {
    "nl": {"name": "Dutch",      "spacy": "nl_core_news_sm", "wordfreq": "nl", "dictionary": "nl", "grammar": "nl"},
    "de": {"name": "German",     "spacy": "de_core_news_sm", "wordfreq": "de", "dictionary": "de", "grammar": "de"},
    "en": {"name": "English",    "spacy": "en_core_web_sm",  "wordfreq": "en", "dictionary": "en", "grammar": "generic"},
    "fr": {"name": "French",     "spacy": "fr_core_news_sm", "wordfreq": "fr", "dictionary": "fr", "grammar": "generic"},
    "es": {"name": "Spanish",    "spacy": "es_core_news_sm", "wordfreq": "es", "dictionary": "es", "grammar": "generic"},
    "it": {"name": "Italian",    "spacy": "it_core_news_sm", "wordfreq": "it", "dictionary": "it", "grammar": "generic"},
    "pt": {"name": "Portuguese", "spacy": "pt_core_news_sm", "wordfreq": "pt", "dictionary": "pt", "grammar": "generic"},
    "sv": {"name": "Swedish",    "spacy": "sv_core_news_sm", "wordfreq": "sv", "dictionary": "sv", "grammar": "generic"},
    "nb": {"name": "Norwegian",  "spacy": "nb_core_news_sm", "wordfreq": "nb", "dictionary": "no", "grammar": "generic"},
    "da": {"name": "Danish",     "spacy": "da_core_news_sm", "wordfreq": "da", "dictionary": "da", "grammar": "generic"},
    "pl": {"name": "Polish",     "spacy": "pl_core_news_sm", "wordfreq": "pl", "dictionary": "pl", "grammar": "generic"},
    "ro": {"name": "Romanian",   "spacy": "ro_core_news_sm", "wordfreq": "ro", "dictionary": "ro", "grammar": "generic"},
    "el": {"name": "Greek",      "spacy": "el_core_news_sm", "wordfreq": "el", "dictionary": "el", "grammar": "generic"},
    "ru": {"name": "Russian",    "spacy": "ru_core_news_sm", "wordfreq": "ru", "dictionary": "ru", "grammar": "generic"},
    "uk": {"name": "Ukrainian",  "spacy": "uk_core_news_sm", "wordfreq": "uk", "dictionary": "uk", "grammar": "generic"},
    "ca": {"name": "Catalan",    "spacy": "ca_core_news_sm", "wordfreq": "ca", "dictionary": "ca", "grammar": "generic"},
    "lt": {"name": "Lithuanian", "spacy": "lt_core_news_sm", "wordfreq": "lt", "dictionary": "lt", "grammar": "generic"},
    "fi": {"name": "Finnish",    "spacy": "fi_core_news_sm", "wordfreq": "fi", "dictionary": "fi", "grammar": "generic"},
}


def normalize(code):
    """'NL', 'nl-NL', 'nl_BE' -> 'nl'. Unknown/empty -> the default language."""
    if not code:
        return DEFAULT_LANG
    base = str(code).strip().lower().replace("_", "-").split("-")[0]
    return base if base in LANGUAGES else DEFAULT_LANG


def get(code):
    """Registry entry for a code (normalised). Always returns a valid entry."""
    return LANGUAGES[normalize(code)]


def name_of(code):
    return get(code)["name"]


def spacy_model(code):
    return get(code).get("spacy")


def wordfreq_code(code):
    return get(code).get("wordfreq")


def dictionary_code(code):
    return get(code).get("dictionary")


def grammar_key(code):
    key = get(code).get("grammar", "generic")
    return key if key in _FIRST_CLASS_GRAMMAR else "generic"


def all_codes():
    return list(LANGUAGES.keys())

