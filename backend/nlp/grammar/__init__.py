"""
Grammar, entry point.

Public API (unchanged for callers): detect_grammar, token_morphology,
describe_morphology. detect_grammar now takes a language and dispatches to the
right rule-set: a first-class module (rules/nl.py, rules/de.py) or the
cross-language default (rules/generic.py). Morphology is universal and lives
in base.py.
"""
from importlib import import_module

import languages
from nlp.grammar.base import token_morphology, describe_morphology, build_result

__all__ = ["detect_grammar", "token_morphology", "describe_morphology"]

_MODULE_CACHE = {}


def _module_for(lang):
    key = languages.grammar_key(lang)  # "nl", "de", or "generic"
    if key not in _MODULE_CACHE:
        _MODULE_CACHE[key] = import_module(f"nlp.grammar.rules.{key}")
    return _MODULE_CACHE[key]


def detect_grammar(tokens, level="A2", lang="nl"):
    """The most teachable construction for this level + the full detected list,
    using the rule-set registered for `lang`."""
    mod = _module_for(lang)
    found = mod.detect(tokens)
    result = build_result(found, mod.RULE_LIBRARY, mod.CONSTRUCTION_META, level)
    result["ruleset"] = languages.grammar_key(lang)
    return result
