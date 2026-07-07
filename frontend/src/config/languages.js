// Client-side language helpers.
//
// The BACKEND is the source of truth for which languages are available and what
// each one supports (see GET /api/meta -> languages[]). This file only provides:
//   1. a small static fallback list, so the UI can render before meta arrives, and
//   2. presentation helpers (flag emoji, display label).
//
// Adding a language is a BACKEND change (edit backend/languages.py). You do not
// need to touch this file — anything the backend reports will show up here, and
// unknown codes just fall back to a globe icon.

// Flag emoji per language code. Missing codes fall back to 🌐.
export const LANG_FLAGS = {
  nl: "🇳🇱", de: "🇩🇪", en: "🇬🇧", fr: "🇫🇷", es: "🇪🇸", it: "🇮🇹",
  pt: "🇵🇹", sv: "🇸🇪", nb: "🇳🇴", da: "🇩🇰", pl: "🇵🇱", ro: "🇷🇴",
  el: "🇬🇷", ru: "🇷🇺", uk: "🇺🇦", ca: "🌐", lt: "🇱🇹", fi: "🇫🇮",
};

// Used only until /api/meta resolves. Mirrors backend/languages.py names.
export const LANG_FALLBACK = [
  { code: "nl", name: "Dutch" },
  { code: "de", name: "German" },
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
];

export function flagFor(code) {
  return LANG_FLAGS[code] || "🌐";
}

export function nameOf(code, languages) {
  const hit = (languages || []).find((l) => l.code === code);
  if (hit) return hit.name;
  const fb = LANG_FALLBACK.find((l) => l.code === code);
  return fb ? fb.name : (code || "").toUpperCase();
}

// A short, human summary of a language's analysis depth, for badges/tooltips.
export function capabilitySummary(lang) {
  if (!lang) return "";
  const grammar =
    lang.grammar === "full" ? "full grammar"
    : lang.grammar === "generic" ? "generic grammar"
    : "morphology only";
  const nlp = lang.spacy ? "spaCy on" : "regex fallback";
  const freq = lang.wordfreq ? "frequency on" : "no frequency";
  return `${nlp} · ${grammar} · ${freq}`;
}
