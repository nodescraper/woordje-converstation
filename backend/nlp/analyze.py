"""
Deterministic layer, part 1: tokenisation, lemma/POS/morphology (spaCy) and
frequency ranking (wordfreq). No LLM — this is where reliability lives.

Everything is per-language and lazy: the spaCy pipeline for a language is loaded
the first time that language is requested and cached. If a model isn't installed
(or spaCy/wordfreq aren't importable), the layer degrades gracefully to a regex
tokeniser and returns what it can, so the API never hard-fails.
"""
import re
import languages

# ---- spaCy (lazy, per language) -----------------------------------------
try:
    import spacy
    SPACY_LIB_OK = True
except Exception:
    spacy = None
    SPACY_LIB_OK = False

# Back-compat flag used by /api/meta and startup logging: is spaCy usable at all?
SPACY_OK = SPACY_LIB_OK

_PIPELINES = {}  # lang code -> spaCy Language or None (cached, incl. failures)


def spacy_model_installed(lang):
    """True if the language's spaCy package is installed (no load, cheap)."""
    if not SPACY_LIB_OK:
        return False
    model = languages.spacy_model(lang)
    return bool(model) and spacy.util.is_package(model)


def get_pipeline(lang):
    """Return a loaded spaCy pipeline for `lang`, or None if unavailable."""
    code = languages.normalize(lang)
    if code in _PIPELINES:
        return _PIPELINES[code]
    nlp = None
    model = languages.spacy_model(code)
    if SPACY_LIB_OK and model:
        try:
            nlp = spacy.load(model)
        except Exception:
            nlp = None
    _PIPELINES[code] = nlp
    return nlp


_UPOS = {"VERB": "verb", "AUX": "verb", "NOUN": "noun", "PROPN": "noun", "ADJ": "adj", "ADV": "adv"}
POS_ABBR = {"verb": "v", "noun": "n", "adj": "adj", "adv": "adv"}


def analyze(text, lang="nl"):
    """Tokenise into dicts: surface / lemma / pos / is_word / morph."""
    nlp = get_pipeline(lang)
    if nlp is not None:
        return [{"surface": t.text, "lemma": t.lemma_.lower(), "pos": _UPOS.get(t.pos_),
                 "upos": t.pos_, "dep": t.dep_, "is_word": t.is_alpha,
                 "morph": str(t.morph)} for t in nlp(text)]
    return [{"surface": tok, "lemma": tok.lower(), "pos": None, "upos": None, "dep": "",
             "is_word": tok.isalpha(), "morph": ""}
            for tok in re.findall(r"\w+|[^\w\s]", text, flags=re.UNICODE)]


# ---- stop words (from spaCy, per language) ------------------------------
# Tiny per-language fallbacks only for when the spaCy model isn't installed.
_FALLBACK_STOP = {
    "nl": {"de", "het", "een", "en", "is", "ik", "je", "van", "op", "te", "in", "dat", "die", "met", "voor", "niet", "ook", "maar"},
    "en": {"the", "a", "an", "and", "is", "i", "you", "of", "to", "in", "that", "it", "for", "not", "on", "with", "as", "but"},
    "de": {"der", "die", "das", "ein", "und", "ist", "ich", "du", "von", "zu", "in", "dass", "mit", "für", "nicht", "auch", "aber"},
}


def get_stopwords(lang):
    """Function-word set for a language. Uses spaCy's built-in list when the
    model is loaded (covers every spaCy language for free); else a small
    fallback; else empty."""
    nlp = get_pipeline(lang)
    if nlp is not None:
        try:
            sw = nlp.Defaults.stop_words
            if sw:
                return {w.lower() for w in sw}
        except Exception:
            pass
    return set(_FALLBACK_STOP.get(languages.normalize(lang), set()))


# ---- frequency -----------------------------------------------------------
try:
    from wordfreq import zipf_frequency
    WORDFREQ_OK = True
except Exception:
    WORDFREQ_OK = False

# Only used when wordfreq isn't installed (keeps the demo alive offline).
_FALLBACK_RANK = {
    "nl": {"boek": 700, "huis": 250, "lopen": 900, "natuur": 1900, "wandeling": 4200,
           "omgeving": 6100, "bosrand": 24000, "weer": 500, "genoten": 5200},
    "en": {"book": 250, "house": 300, "walk": 900, "nature": 1500, "environment": 2600},
}


def approx_rank(lemma, lang="nl"):
    """Approximate frequency rank (1 = most common). None if unknown."""
    if WORDFREQ_OK:
        try:
            z = zipf_frequency(lemma, languages.wordfreq_code(lang))
        except Exception:
            z = 0
        return None if z <= 0 else int(10 ** (8 - z))
    return _FALLBACK_RANK.get(languages.normalize(lang), {}).get(lemma)


def wordfreq_supports(lang):
    """Cheap check that wordfreq has data for a language (used by /api/meta)."""
    if not WORDFREQ_OK:
        return False
    try:
        from wordfreq import available_languages
        return languages.wordfreq_code(lang) in available_languages()
    except Exception:
        return True  # library present; assume supported rather than block
