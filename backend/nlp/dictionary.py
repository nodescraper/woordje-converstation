"""
Deterministic meaning lookup via the free Wiktionary-backed dictionary API
(freedictionaryapi.com), which is keyless, CORS-enabled and covers many
languages. Prefers an English translation; falls back to a definition in the
source language, then to a clear "not found". Per-language via the `lang` arg.
"""
import json
import urllib.request
import urllib.parse
import languages

# When the target language is English, an English "translation" is meaningless;
# prefer the definition instead.
_GLOSS_LANG = "en"


def fetch_meaning(lemma, lang="nl", online=True):
    code = languages.dictionary_code(lang)
    if online and lemma:
        try:
            url = (f"https://freedictionaryapi.com/api/v1/entries/{code}/"
                   f"{urllib.parse.quote(lemma)}?translations=true")
            req = urllib.request.Request(url, headers={
                "User-Agent": "woordje-sandbox/0.2 (language learning app)",
                "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=8) as r:
                data = json.load(r)
            entries = data.get("entries", []) if isinstance(data, dict) else []
            definition = None
            translation = None
            examples = []
            part_of_speech = None
            pronunciation = None
            translations = []
            for e in entries:
                if pronunciation is None:
                    pronunciation = e.get("pronunciation") or e.get("pronunciation_ipa")
                if part_of_speech is None:
                    part_of_speech = e.get("partOfSpeech") or e.get("part_of_speech")
                for s in e.get("senses", []):
                    if definition is None and s.get("definition"):
                        definition = s["definition"]
                    for ex in s.get("examples", []) or []:
                        if ex and ex not in examples:
                            examples.append(ex)
                    for tr in s.get("translations", []):
                        tcode = (tr.get("language") or {}).get("code")
                        word = tr.get("word")
                        if tcode == _GLOSS_LANG and word:
                            if translation is None:
                                translation = word
                            if word not in translations:
                                translations.append(word)
            # For an English target, the definition is the useful gloss.
            shown = (definition if code == _GLOSS_LANG else (translation or definition))
            print(f"[DICT/{code}] {lemma!r}  translation={translation!r}  "
                  f"definition={(definition or '')[:60]!r}", flush=True)
            if shown:
                return {
                    "tr": shown,
                    "definition": definition,
                    "translations": translations[:5],
                    "examples": examples[:4],
                    "part_of_speech": part_of_speech,
                    "pronunciation": pronunciation,
                }
        except Exception as ex:
            print(f"[DICT/{code}] {lemma!r}  ERROR {type(ex).__name__}: {ex}", flush=True)
    return {
        "tr": "(no dictionary entry found)",
        "definition": None,
        "translations": [],
        "examples": [],
        "part_of_speech": None,
        "pronunciation": None,
    }
