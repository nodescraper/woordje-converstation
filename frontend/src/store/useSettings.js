import { useLocalStorage } from "./useVocab";
import { PERSONAS } from "@/config/personas";

// Session settings, client-owned and persisted.
export function useSettings() {
  const [settings, setSettings] = useLocalStorage("woordje.settings", {
    lang: null,      // null -> backend defaultLang until meta loads
    level: "A2",
    topic: "daily life",
    customTopic: "",
    personaId: PERSONAS[0].id,
    customAgentContext: "",
    customTargetWords: "",
    provider: null,  // null -> backend default until meta loads
    model: null,
  });

  const patch = (p) => setSettings((s) => ({ ...s, ...p }));
  const persona = PERSONAS.find((p) => p.id === settings.personaId) || PERSONAS[0];
  const effectiveTopic = settings.topic === "custom" ? settings.customTopic.trim() : settings.topic;

  return { settings, patch, persona, effectiveTopic };
}
