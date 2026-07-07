"""
Deterministic-layer tests.

These cover the language-agnostic plumbing that must behave correctly *without*
any LLM and *without* any spaCy model installed — i.e. they pass in the same
degraded/offline mode CI runs in. They intentionally do NOT assert on model
output; they assert on the registry, the graceful fallbacks, and the grammar
dispatcher wiring.

Run:  pytest -q      (from the backend/ directory)
"""
import os
import sys

# Make `import languages`, `import nlp...` work no matter where pytest is invoked.
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import languages
from nlp.analyze import analyze, approx_rank, get_stopwords, spacy_model_installed
from nlp.annotate import annotate, _norm_vocab
from nlp.grammar import detect_grammar
from nlp.dictionary import fetch_meaning


# ------------------------------------------------------------------ registry
def test_registry_has_expected_languages():
    codes = set(languages.all_codes())
    # A representative spread; the registry may grow, so just require these exist.
    for c in ("nl", "de", "en", "fr", "es"):
        assert c in codes
    assert languages.DEFAULT_LANG in codes


def test_every_language_entry_is_well_formed():
    for code in languages.all_codes():
        e = languages.get(code)
        for field in ("name", "spacy", "wordfreq", "dictionary", "grammar"):
            assert field in e, f"{code} missing {field}"
        assert e["grammar"] in ("nl", "de", "generic")


def test_normalize_variants_and_regions():
    assert languages.normalize("NL") == "nl"
    assert languages.normalize("nl-BE") == "nl"
    assert languages.normalize("en_US") == "en"
    assert languages.normalize("  De  ") == "de"


def test_normalize_unknown_falls_back_to_default():
    assert languages.normalize("zz-XX") == languages.DEFAULT_LANG
    assert languages.normalize("") == languages.DEFAULT_LANG
    assert languages.normalize(None) == languages.DEFAULT_LANG


def test_grammar_key_maps_first_class_and_generic():
    assert languages.grammar_key("nl") == "nl"
    assert languages.grammar_key("de") == "de"
    # A language with no hand-tuned ruleset should route to generic.
    assert languages.grammar_key("es") == "generic"


def test_accessor_helpers():
    assert languages.name_of("nl") == "Dutch"
    assert languages.spacy_model("en")  # non-empty model package name
    assert languages.wordfreq_code("nb")  # Norwegian Bokmål has a wordfreq code
    # Norwegian dictionary code collapses to the macrolanguage "no".
    assert languages.dictionary_code("nb") == "no"


# ------------------------------------------------------------------ analyze
def test_analyze_fallback_tokenizes_without_spacy():
    toks = analyze("Ik ga naar de winkel.", "nl")
    words = [t for t in toks if t["is_word"]]
    assert [t["surface"] for t in words] == ["Ik", "ga", "naar", "de", "winkel"]
    # Punctuation is captured as a non-word token.
    assert any(not t["is_word"] for t in toks)


def test_analyze_tokens_have_required_keys():
    for t in analyze("Hallo wereld", "nl"):
        for key in ("surface", "lemma", "pos", "upos", "dep", "is_word", "morph"):
            assert key in t


def test_analyze_empty_string_is_empty():
    assert analyze("", "nl") == []


def test_stopwords_available_for_core_languages():
    for lang in ("nl", "en", "de"):
        sw = get_stopwords(lang)
        assert isinstance(sw, set) and len(sw) > 0


def test_approx_rank_is_none_or_positive_int():
    r = approx_rank("de", "nl")
    assert r is None or (isinstance(r, int) and r > 0)


# ------------------------------------------------------------------ annotate
def test_norm_vocab_accepts_list_and_dict():
    assert _norm_vocab(["Hoi", "GAAN"]) == {"hoi", "gaan"}
    assert _norm_vocab({"Hoi": 1, "Gaan": 2}) == {"hoi", "gaan"}
    assert _norm_vocab(None) == set()


def test_annotate_shape_and_language_threading():
    out = annotate("Ik ga naar de winkel.", "A2", ["ik", "ga"], "nl")
    assert out["lang"] == "nl"
    assert isinstance(out["tokens"], list) and out["tokens"]
    assert "grammar" in out and out["grammar"]["ruleset"] == "nl"


def test_annotate_marks_known_vocab():
    # Use a content word: function words are classified as "stop" first, by design.
    out = annotate("Ik ga naar de winkel.", "A2", ["winkel"], "nl")
    kinds = {t["surface"].lower(): t["kind"] for t in out["tokens"] if t.get("kind") != "punct"}
    assert kinds.get("winkel") == "known"


# ------------------------------------------------------------------ grammar dispatch
def test_grammar_dispatch_selects_ruleset_per_language():
    nl = detect_grammar(analyze("Ik heb gegeten.", "nl"), "A2", "nl")
    de = detect_grammar(analyze("Ich habe gegessen.", "de"), "A2", "de")
    generic = detect_grammar(analyze("He comido.", "es"), "A2", "es")
    assert nl["ruleset"] == "nl"
    assert de["ruleset"] == "de"
    assert generic["ruleset"] == "generic"


def test_grammar_result_has_primary_and_all_keys():
    res = detect_grammar(analyze("Ik ga.", "nl"), "A2", "nl")
    assert "primary" in res and "all" in res
    assert isinstance(res["all"], list)


def test_grammar_handles_empty_tokens():
    res = detect_grammar([], "A2", "nl")
    assert res["primary"] is None
    assert res["all"] == []


# ------------------------------------------------------------------ dictionary (offline path)
def test_fetch_meaning_offline_is_graceful():
    m = fetch_meaning("fiets", "nl", online=False)
    assert set(m.keys()) == {"tr", "definition", "translations", "examples", "part_of_speech", "pronunciation"}
    assert isinstance(m["examples"], list)
    assert isinstance(m["translations"], list)
    assert isinstance(m["tr"], str)
