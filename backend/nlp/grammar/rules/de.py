"""
German constructions — a second hand-authored rule-set, to show the framework
generalises beyond the reference language. German mirrors Dutch closely (V2,
separable verbs, modal + infinitive, perfect with haben/sein), so it is a
natural second first-class language.
"""

RULE_LIBRARY = {
    "perfect_tense":         ("Perfekt", "haben/sein + past participle, for completed past actions.", "Ich habe ein Buch gelesen."),
    "modal_plus_infinitive": ("Modal + infinitive", "A modal (können, wollen, müssen, dürfen, sollen) sends the main verb to the end as an infinitive.", "Ich möchte mich entspannen."),
    "v2_word_order":         ("V2 word order", "In a main clause the finite verb is the second element.", "Heute gehe ich nach Hause."),
    "separable_verb":        ("Trennbares Verb", "A separable prefix detaches and moves to the end of the clause.", "Ich stehe um sieben Uhr auf."),
    "future_werden":         ("Future with 'werden'", "'werden' + infinitive expresses the future.", "Ich werde morgen arbeiten."),
    "um_zu_infinitive":      ("um ... zu + infinitive", "Expresses purpose: 'in order to'.", "Ich gehe raus, um zu laufen."),
    "subordinate_clause":    ("Nebensatz", "After words like weil/dass/wenn, the verb moves to the end.", "Ich bleibe zu Hause, weil ich müde bin."),
    "negation_nicht_kein":   ("Negation (nicht / kein)", "'nicht' negates verbs/adjectives; 'kein' negates nouns.", "Ich habe keine Zeit. Es ist nicht schön."),
    "reflexive_verb":        ("Reflexives Verb", "A verb used with sich/mich/dich, acting on the subject.", "Ich fühle mich gut."),
    "comparative_als":       ("Comparison with 'als'", "comparative + 'als' to compare two things.", "Das ist schöner als gestern."),
    "question_inversion":    ("Yes/no question (inversion)", "The verb comes before the subject to ask a question.", "Gehst du heute arbeiten?"),
    "wh_question":           ("W-Frage", "A question opened by a question word (was, wo, wie...).", "Was machst du heute?"),
}

CONSTRUCTION_META = {
    "perfect_tense":         {"prio": 95, "minlevel": "A2"},
    "subordinate_clause":    {"prio": 90, "minlevel": "A2"},
    "separable_verb":        {"prio": 88, "minlevel": "A2"},
    "modal_plus_infinitive": {"prio": 85, "minlevel": "A1"},
    "um_zu_infinitive":      {"prio": 80, "minlevel": "A2"},
    "future_werden":         {"prio": 72, "minlevel": "A2"},
    "comparative_als":       {"prio": 70, "minlevel": "A2"},
    "reflexive_verb":        {"prio": 68, "minlevel": "A2"},
    "v2_word_order":         {"prio": 60, "minlevel": "A1"},
    "question_inversion":    {"prio": 55, "minlevel": "A1"},
    "wh_question":           {"prio": 40, "minlevel": "A1"},
    "negation_nicht_kein":   {"prio": 35, "minlevel": "A1"},
}

_MODALS = {"können", "wollen", "müssen", "dürfen", "sollen", "mögen", "möchten"}
_SEP_PREFIXES = {"an", "auf", "aus", "ein", "mit", "ab", "zu", "bei", "vor", "nach", "zurück", "weg", "los", "her", "hin", "fest", "teil"}
_SUBORD = {"weil", "dass", "wenn", "als", "während", "obwohl", "damit", "ob", "bevor", "nachdem", "sobald", "falls"}
_WH = {"was", "wo", "wie", "warum", "wer", "welche", "welcher", "welches", "wann", "woher", "wohin", "wieso", "weshalb"}
_REFLEX = {"sich", "mich", "dich", "uns", "euch"}


def detect(tokens):
    found = set()
    lemmas = [t["lemma"] for t in tokens]
    pos = [t["pos"] for t in tokens]
    morphs = [t.get("morph", "") for t in tokens]
    surfaces = [t["surface"].lower() for t in tokens]
    words = [t for t in tokens if t["is_word"]]
    has_part = any("VerbForm=Part" in m for m in morphs) or any(s.startswith("ge") and p == "verb" for s, p in zip(surfaces, pos))
    if any(l in ("haben", "sein") for l in lemmas) and has_part:
        found.add("perfect_tense")
    if any(l in _MODALS for l in lemmas) and pos.count("verb") >= 2:
        found.add("modal_plus_infinitive")
    if "werden" in lemmas and any("VerbForm=Inf" in m for m in morphs):
        found.add("future_werden")
    if "um" in lemmas and "zu" in lemmas and any("VerbForm=Inf" in m for m in morphs):
        found.add("um_zu_infinitive")
    if any(l in _SUBORD for l in lemmas):
        found.add("subordinate_clause")
    if any(l in ("nicht", "kein", "keine", "keinen", "keinem", "keiner") for l in lemmas):
        found.add("negation_nicht_kein")
    if any(s in _REFLEX for s in surfaces) and "sich" in surfaces:
        found.add("reflexive_verb")
    elif "sich" in lemmas:
        found.add("reflexive_verb")
    if any("Degree=Cmp" in m for m in morphs) and "als" in lemmas:
        found.add("comparative_als")
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
