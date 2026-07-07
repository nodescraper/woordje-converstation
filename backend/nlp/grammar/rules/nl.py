"""
Dutch constructions — the reference, hand-authored rule-set.

This is what a first-class language module looks like: expose RULE_LIBRARY,
CONSTRUCTION_META and detect(tokens) -> set(ids). The dispatcher (grammar/
__init__.py) turns the detected ids into cards via base.build_result.
"""

RULE_LIBRARY = {
    "perfect_tense":         ("Perfect tense", "hebben/zijn + past participle, for completed past actions.", "Ik heb een boek gelezen."),
    "modal_plus_infinitive": ("Modal + infinitive", "A modal (kunnen, willen, moeten, mogen) sends the main verb to the end as an infinitive.", "Ik wil graag ontspannen."),
    "v2_word_order":         ("V2 word order", "In a main clause the finite verb is the second element.", "Vandaag ga ik naar huis."),
    "separable_verb":        ("Separable verb", "A separable prefix detaches and moves to the end of the clause.", "Ik sta om zeven uur op."),
    "future_gaan":           ("Future with 'gaan'", "'gaan' + infinitive expresses a near-future plan.", "Ik ga morgen werken."),
    "om_te_infinitive":      ("om ... te + infinitive", "Expresses purpose: 'in order to'.", "Ik ga naar buiten om te lopen."),
    "subordinate_clause":    ("Subordinate clause", "After words like omdat/dat/als, the verb moves to the end.", "Ik blijf thuis omdat ik moe ben."),
    "negation_niet_geen":    ("Negation (niet / geen)", "'niet' negates verbs/adjectives; 'geen' negates nouns.", "Ik heb geen tijd. Het is niet leuk."),
    "reflexive_verb":        ("Reflexive verb", "A verb used with zich/me/je, acting on the subject.", "Ik voel me goed."),
    "comparative_dan":       ("Comparison with 'dan'", "comparative + 'dan' to compare two things.", "Dit is leuker dan gisteren."),
    "question_inversion":    ("Yes/no question (inversion)", "The verb comes before the subject to ask a question.", "Ga je vandaag werken?"),
    "wh_question":           ("Wh-question", "A question opened by a question word (wat, waar, hoe...).", "Wat doe je vandaag?"),
}

CONSTRUCTION_META = {
    "perfect_tense":         {"prio": 95, "minlevel": "A2"},
    "subordinate_clause":    {"prio": 90, "minlevel": "A2"},
    "separable_verb":        {"prio": 88, "minlevel": "A2"},
    "modal_plus_infinitive": {"prio": 85, "minlevel": "A1"},
    "om_te_infinitive":      {"prio": 80, "minlevel": "A2"},
    "future_gaan":           {"prio": 72, "minlevel": "A1"},
    "comparative_dan":       {"prio": 70, "minlevel": "A2"},
    "reflexive_verb":        {"prio": 68, "minlevel": "A2"},
    "v2_word_order":         {"prio": 60, "minlevel": "A1"},
    "question_inversion":    {"prio": 55, "minlevel": "A1"},
    "wh_question":           {"prio": 40, "minlevel": "A1"},
    "negation_niet_geen":    {"prio": 35, "minlevel": "A1"},
}

_MODALS = {"kunnen", "willen", "moeten", "mogen", "zullen"}
_SEP_PREFIXES = {"op", "aan", "uit", "mee", "af", "in", "toe", "bij", "door", "over", "na", "voor", "terug"}
_SUBORD = {"omdat", "dat", "als", "toen", "terwijl", "hoewel", "zodat", "wanneer", "want", "of"}
_WH = {"wat", "waar", "hoe", "waarom", "wie", "welke", "wanneer"}


def detect(tokens):
    found = set()
    lemmas = [t["lemma"] for t in tokens]
    pos = [t["pos"] for t in tokens]
    morphs = [t.get("morph", "") for t in tokens]
    surfaces = [t["surface"].lower() for t in tokens]
    words = [t for t in tokens if t["is_word"]]
    has_part = any("Part" in m for m in morphs) or any(s.startswith("ge") and p == "verb" for s, p in zip(surfaces, pos))
    if any(l in ("hebben", "zijn") for l in lemmas) and has_part:
        found.add("perfect_tense")
    if any(l in _MODALS for l in lemmas) and pos.count("verb") >= 2:
        found.add("modal_plus_infinitive")
    if "gaan" in lemmas and any("Inf" in m for m in morphs):
        found.add("future_gaan")
    if "om" in lemmas and "te" in lemmas and any("Inf" in m for m in morphs):
        found.add("om_te_infinitive")
    if any(l in _SUBORD for l in lemmas):
        found.add("subordinate_clause")
    if any(l in ("niet", "geen") for l in lemmas):
        found.add("negation_niet_geen")
    if "zich" in lemmas or "zichzelf" in lemmas:
        found.add("reflexive_verb")
    if any("Degree=Cmp" in m for m in morphs) and "dan" in lemmas:
        found.add("comparative_dan")
    if words and words[-1]["lemma"] in _SEP_PREFIXES:
        found.add("separable_verb")
    if surfaces and surfaces[-1] == "?":
        if words and words[0]["lemma"] in _WH:
            found.add("wh_question")
        elif words and words[0]["pos"] == "verb":
            found.add("question_inversion")
    if len(words) >= 2 and words[0]["pos"] == "adv" and words[1]["pos"] == "verb":
        found.add("v2_word_order")
    return found
