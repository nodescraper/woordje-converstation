"""
Cross-language constructions (the default rule-set).

Detected purely from Universal-Dependencies features and relations that every
spaCy model emits the same way — so this works for any language that has a model,
without hand-authoring. Examples in the cards are English illustrations of the
concept (the UI copy is English); the detection itself is language-agnostic.

For first-class, hand-tuned constructions in a specific language, copy this file
to rules/<code>.py, rewrite the rules + examples, and point languages.py at it.
"""

RULE_LIBRARY = {
    "perfect_tense":     ("Compound/perfect tense", "An auxiliary verb plus a participle, for completed actions.", "I have finished the book."),
    "past_tense":        ("Past tense", "A simple past verb form.", "She walked home."),
    "future_tense":      ("Future tense", "A verb form expressing something that will happen.", "We will travel tomorrow."),
    "subordinate_clause":("Subordinate clause", "A clause introduced by a subordinating word (because, that, if, when).", "I stayed home because I was tired."),
    "comparative":       ("Comparative", "The 'more' form used to compare two things.", "This is easier than yesterday."),
    "superlative":       ("Superlative", "The 'most' form.", "That was the hardest part."),
    "negation":          ("Negation", "The sentence is negated.", "I do not have time."),
    "imperative":        ("Imperative", "A command or instruction.", "Open the window."),
    "passive":           ("Passive voice", "The subject receives the action.", "The letter was written."),
    "wh_question":       ("Wh-question", "A question opened by a question word.", "What are you doing?"),
    "yesno_question":    ("Yes/no question", "A question answerable with yes or no.", "Are you coming?"),
}

CONSTRUCTION_META = {
    "perfect_tense":      {"prio": 80, "minlevel": "A2"},
    "subordinate_clause": {"prio": 75, "minlevel": "A2"},
    "passive":            {"prio": 70, "minlevel": "B1"},
    "comparative":        {"prio": 65, "minlevel": "A2"},
    "superlative":        {"prio": 62, "minlevel": "A2"},
    "past_tense":         {"prio": 60, "minlevel": "A1"},
    "future_tense":       {"prio": 55, "minlevel": "A1"},
    "imperative":         {"prio": 50, "minlevel": "A1"},
    "wh_question":        {"prio": 45, "minlevel": "A1"},
    "yesno_question":     {"prio": 42, "minlevel": "A1"},
    "negation":           {"prio": 40, "minlevel": "A1"},
}


def _has_feat(morphs, feat):
    return any(feat in (m or "") for m in morphs)


def detect(tokens):
    found = set()
    morphs = [t.get("morph", "") for t in tokens]
    deps = [(t.get("dep") or "").lower() for t in tokens]
    upos = [t.get("upos") for t in tokens]
    words = [t for t in tokens if t["is_word"]]
    surfaces = [t["surface"].lower() for t in tokens]

    has_part = _has_feat(morphs, "VerbForm=Part")
    has_aux = "AUX" in upos or any(d.startswith("aux") for d in deps)
    if has_part and has_aux:
        found.add("perfect_tense")
    if _has_feat(morphs, "Tense=Past"):
        found.add("past_tense")
    if _has_feat(morphs, "Tense=Fut"):
        found.add("future_tense")
    if _has_feat(morphs, "Degree=Cmp"):
        found.add("comparative")
    if _has_feat(morphs, "Degree=Sup"):
        found.add("superlative")
    if _has_feat(morphs, "Mood=Imp"):
        found.add("imperative")
    if any(d == "mark" for d in deps):
        found.add("subordinate_clause")
    if any("pass" in d for d in deps):
        found.add("passive")
    if _has_feat(morphs, "Polarity=Neg") or any(d == "neg" for d in deps):
        found.add("negation")
    if surfaces and surfaces[-1] == "?":
        if any("PronType=Int" in (m or "") for m in morphs):
            found.add("wh_question")
        else:
            found.add("yesno_question")
    return found
