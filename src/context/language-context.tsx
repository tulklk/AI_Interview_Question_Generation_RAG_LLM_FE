"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { en } from "@/lib/i18n/en";
import { vi } from "@/lib/i18n/vi";
import type { Translations } from "@/lib/i18n/en";

export type Lang = "en" | "vi";

const STORAGE_KEY = "hiregena-lang";
const dictionaries: Record<Lang, Translations> = { en, vi };

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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved === "en" || saved === "vi") {
      setLangState(saved);
    }
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }

  const t = dictionaries[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
