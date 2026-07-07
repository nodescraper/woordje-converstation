"""
Grammar, shared foundation.

TIER 1 (morphology) is UNIVERSAL: it reads Universal-Dependencies morph features
(Tense=Past, Number=Plur, Degree=Cmp, ...) that every spaCy model emits in the
same vocabulary, so a single set of labels works for every language. Wording is
kept language-neutral here; a language module may override examples if it wants.

TIER 2 (constructions) is authored per language (see rules/<code>.py) or via
the cross-language `generic` module. This file gives them the shared machinery:
level ordering and the card/result builders.
"""

# ---- Tier 1: morphological features -> friendly labels (language-neutral) --
MORPH_LABELS = {
    "Tense=Pres":    ("Present tense", "Describes something happening now or generally true."),
    "Tense=Past":    ("Past tense", "A completed or ongoing action in the past."),
    "Tense=Fut":     ("Future tense", "An action that will happen."),
    "VerbForm=Part": ("Participle", "A verb form used in compound tenses or as an adjective."),
    "VerbForm=Inf":  ("Infinitive", "The base, unconjugated verb form."),
    "VerbForm=Fin":  ("Finite verb", "A conjugated verb that agrees with its subject."),
    "VerbForm=Ger":  ("Gerund", "A verb form acting like a noun ('-ing' in English)."),
    "Number=Sing":   ("Singular", "One of something."),
    "Number=Plur":   ("Plural", "More than one."),
    "Degree=Cmp":    ("Comparative", "The 'more' form of an adjective/adverb."),
    "Degree=Sup":    ("Superlative", "The 'most' form of an adjective/adverb."),
    "Degree=Pos":    ("Base form", "The plain adjective/adverb form."),
    "Definite=Def":  ("Definite", "Refers to a specific, known thing (like 'the')."),
    "Definite=Ind":  ("Indefinite", "Refers to any, non-specific thing (like 'a')."),
    "Person=1":      ("1st person", "Refers to the speaker (I / we)."),
    "Person=2":      ("2nd person", "Refers to the listener (you)."),
    "Person=3":      ("3rd person", "Refers to someone/something else (he/she/it/they)."),
    "PronType=Prs":  ("Personal pronoun", "I, you, he, she, we, they, ..."),
    "PronType=Dem":  ("Demonstrative", "Pointing words (this, that, these, those)."),
    "PronType=Int":  ("Question word", "who, what, where, how, why, ..."),
    "PronType=Rel":  ("Relative pronoun", "Links a relative clause (who/that/which)."),
    "PronType=Ind":  ("Indefinite pronoun", "someone, something, any, ..."),
    "Gender=Neut":   ("Neuter", "Neuter grammatical gender."),
    "Gender=Com":    ("Common gender", "Common grammatical gender."),
    "Gender=Masc":   ("Masculine", "Masculine grammatical gender."),
    "Gender=Fem":    ("Feminine", "Feminine grammatical gender."),
    "Case=Nom":      ("Nominative", "The subject case."),
    "Case=Acc":      ("Accusative", "The direct-object case."),
    "Case=Dat":      ("Dative", "The indirect-object case."),
    "Case=Gen":      ("Genitive", "The possessive case."),
    "Mood=Ind":      ("Indicative", "States a fact."),
    "Mood=Imp":      ("Imperative", "Gives a command."),
    "Mood=Sub":      ("Subjunctive", "Expresses a wish, doubt, or hypothetical."),
    "Foreign=Yes":   ("Foreign / loan word", "Borrowed from another language."),
}

_MORPH_INTERESTING_PREFIX = (
    "Tense=", "VerbForm=", "Degree=", "Number=Plur", "PronType=Int", "PronType=Dem",
    "PronType=Rel", "Definite=Ind", "Case=", "Mood=Imp", "Mood=Sub", "Foreign=Yes")


def describe_morphology(tokens):
    """Tier 1: labelled observations across a whole sentence (session tally)."""
    seen = {}
    for t in tokens:
        morph = t.get("morph", "")
        if not morph:
            continue
        for feat in morph.split("|"):
            if not any(feat.startswith(p) or feat == p for p in _MORPH_INTERESTING_PREFIX):
                continue
            if feat not in MORPH_LABELS:
                continue
            label, expl = MORPH_LABELS[feat]
            entry = seen.setdefault(feat, {"id": "m:" + feat, "name": label,
                                           "explain": expl, "kind": "morphology",
                                           "examples": []})
            if t["surface"] not in entry["examples"]:
                entry["examples"].append(t["surface"])
    out = []
    for e in seen.values():
        e["example"] = ", ".join(e["examples"][:4])
        out.append(e)
    return out


def token_morphology(tok):
    """Tier 1 for a single token — used in the word tap-sheet, on demand."""
    out = []
    for feat in (tok.get("morph", "") or "").split("|"):
        if feat in MORPH_LABELS:
            label, expl = MORPH_LABELS[feat]
            out.append({"feat": feat, "label": label, "explain": expl})
    return out


# ---- Tier 2 machinery ----------------------------------------------------
LEVEL_ORDER = {"A1": 0, "A2": 1, "B1": 2, "B2": 3, "C1": 4}


def build_result(found, rule_library, construction_meta, level="A2"):
    """Turn a set of detected construction ids into {primary, all}.

    `rule_library[id]`    = (name, explain, example)
    `construction_meta[id]` = {"prio": int, "minlevel": "A2"}
    The 'primary' is the highest-priority construction at or below `level`.
    """
    lvl = LEVEL_ORDER.get(level, 1)

    def card(r):
        name, explain, example = rule_library[r]
        return {"id": r, "name": name, "explain": explain, "example": example,
                "prio": construction_meta[r]["prio"]}

    all_cons = sorted((card(r) for r in found if r in construction_meta),
                      key=lambda c: -c["prio"])
    teachable = [c for c in all_cons
                 if LEVEL_ORDER.get(construction_meta[c["id"]]["minlevel"], 0) <= lvl]
    return {"primary": teachable[0] if teachable else None, "all": all_cons}
