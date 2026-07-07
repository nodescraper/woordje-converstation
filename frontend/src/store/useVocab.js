import { useState, useEffect, useCallback, useRef } from "react";
import { seedFor } from "@/config/seeds";

// Small persisted-state hook. All product state (vocab, settings) lives in the
// client and survives refresh via localStorage.
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota errors */
    }
  }, [key, value]);
  return [value, setValue];
}

const keyFor = (lang) => `woordje.vocab.${lang || "nl"}`;

function loadList(lang) {
  try {
    const raw = localStorage.getItem(keyFor(lang));
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return seedFor(lang);
}

// Vocab store: the learner's word list, namespaced PER LANGUAGE. Switching the
// language transparently swaps to that language's list (seeded on first use).
// Fully client-owned; the backend never stores vocab.
export function useVocab(lang = "nl") {
  const [items, setItems] = useState(() => loadList(lang));
  const langRef = useRef(lang);
  const justSwitched = useRef(false);

  // When the language changes, load that language's saved list.
  useEffect(() => {
    if (langRef.current !== lang) {
      langRef.current = lang;
      justSwitched.current = true;
      setItems(loadList(lang));
    }
  }, [lang]);

  // Persist — but skip the render right after a switch, so we never write the
  // previous language's items into the new language's key.
  useEffect(() => {
    if (justSwitched.current) {
      justSwitched.current = false;
      return;
    }
    try {
      localStorage.setItem(keyFor(langRef.current), JSON.stringify(items));
    } catch {
      /* ignore quota errors */
    }
  }, [items]);

  const add = useCallback((word, translation = "") => {
    const w = word.trim().toLowerCase();
    if (!w) return;
    setItems((prev) =>
      prev.some((x) => x.word === w) ? prev : [{ word: w, translation }, ...prev]
    );
  }, []);

  const remove = useCallback((word) => {
    setItems((prev) => prev.filter((x) => x.word !== word));
  }, []);

  const has = useCallback(
    (word) => items.some((x) => x.word === word.toLowerCase()),
    [items]
  );

  // shape the backend expects
  const words = items.map((x) => x.word);

  return { items, add, remove, has, words, setItems };
}
