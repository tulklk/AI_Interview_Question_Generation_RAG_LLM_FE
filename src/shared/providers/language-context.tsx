"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en } from "@/core/i18n/en";
import type { Translations } from "@/core/i18n/en";

export type Lang = "en" | "vi";

const STORAGE_KEY = "hiregena-lang";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: en,
});

function isLang(v: string | null | undefined): v is Lang {
  return v === "en" || v === "vi";
}

// "en" is the SSR/first-paint default and is always bundled eagerly. "vi" is
// only fetched — as a separate code-split chunk — the first time it's
// actually needed (saved preference or manual switch), so English-default
// sessions never pay to download the Vietnamese dictionary.
function loadDictionary(lang: Lang): Promise<Translations> {
  if (lang === "en") return Promise.resolve(en);
  return import("@/core/i18n/vi").then((m) => m.vi);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [t, setT] = useState<Translations>(en);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l);
    loadDictionary(l).then((dict) => {
      setLangState(l);
      setT(dict);
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLang(saved) && saved !== "en") {
      loadDictionary(saved).then((dict) => {
        setLangState(saved);
        setT(dict);
      });
    }
  }, []);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
