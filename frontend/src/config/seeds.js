// Optional starter vocabulary, per language. When a learner opens a language for
// the first time, their word list is seeded from here (purely a convenience —
// everything is editable and stored per language in localStorage).
//
// Languages not listed here simply start empty. Keep these short; they are just
// a friendly starting point, not a curriculum.
export const SEEDS = {
  nl: [
    { word: "boek", translation: "book" },
    { word: "huis", translation: "house" },
    { word: "lopen", translation: "to walk" },
    { word: "eten", translation: "to eat" },
    { word: "leuk", translation: "nice, fun" },
  ],
  de: [
    { word: "buch", translation: "book" },
    { word: "haus", translation: "house" },
    { word: "gehen", translation: "to go" },
    { word: "essen", translation: "to eat" },
    { word: "schön", translation: "nice, beautiful" },
  ],
  en: [
    { word: "book", translation: "livre / Buch" },
    { word: "house", translation: "maison / Haus" },
    { word: "walk", translation: "to move on foot" },
    { word: "eat", translation: "to consume food" },
  ],
  fr: [
    { word: "livre", translation: "book" },
    { word: "maison", translation: "house" },
    { word: "manger", translation: "to eat" },
    { word: "aimer", translation: "to like / love" },
  ],
  es: [
    { word: "libro", translation: "book" },
    { word: "casa", translation: "house" },
    { word: "comer", translation: "to eat" },
    { word: "gustar", translation: "to like" },
  ],
};

export function seedFor(code) {
  return SEEDS[code] ? SEEDS[code].map((x) => ({ ...x })) : [];
}
