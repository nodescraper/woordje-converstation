"""
Combine the deterministic layers into the annotation the client renders:
per-token classification + the teachable grammar construction for the sentence.

The known-vocabulary set is PASSED IN by the caller (the backend stores no
vocab). Classification is simple and SRS-free:
  known    - the lemma is in the learner's vocab
  gap      - not known, but frequent enough to be worth learning at this level
  unknown  - not known and rare
  stop     - function word, not highlighted
  punct    - punctuation
Everything is per-language: stop words, frequency, and grammar all key off `lang`.
"""
from nlp.analyze import analyze, approx_rank, get_stopwords, POS_ABBR
from nlp.grammar import detect_grammar, token_morphology

# frequency-rank cutoff below which an unknown word is worth flagging as a "gap"
IMPORTANT_MAX_RANK = {"A1": 1500, "A2": 3000, "B1": 6000, "B2": 12000, "C1": 30000}


def _norm_vocab(vocab):
    """Accept a list of words or a dict keyed by word; return a lowercase set."""
    if not vocab:
        return set()
    if isinstance(vocab, dict):
        return {str(w).strip().lower() for w in vocab.keys()}
    return {str(w).strip().lower() for w in vocab}


def classify(tok, level, known, lang, stop):
    if not tok["is_word"]:
        return {"kind": "punct", "surface": tok["surface"]}
    l = tok["lemma"]
    base = {"surface": tok["surface"], "lemma": l, "pos": tok["pos"],
            "pos_abbr": POS_ABBR.get(tok["pos"], ""), "rank": approx_rank(l, lang),
            "morph": token_morphology(tok)}
    if l in stop:
        return {"kind": "stop", **base}
    if l in known:
        return {"kind": "known", **base}
    r = base["rank"]; cutoff = IMPORTANT_MAX_RANK.get(level, 3000)
    if r is not None and r <= cutoff:
        return {"kind": "gap", **base}
    return {"kind": "unknown", **base}


def annotate(text, level, vocab=None, lang="nl"):
    known = _norm_vocab(vocab)
    stop = get_stopwords(lang)
    toks = analyze(text, lang)
    return {"text": text, "lang": lang,
            "tokens": [classify(t, level, known, lang, stop) for t in toks],
            "grammar": detect_grammar(toks, level, lang)}
