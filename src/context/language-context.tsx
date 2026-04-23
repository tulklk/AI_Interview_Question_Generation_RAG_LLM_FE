"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { en } from "@/lib/i18n/en";
import { vi } from "@/lib/i18n/vi";
import type { Translations } from "@/lib/i18n/en";

export type Lang = "en" | "vi";

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
  const [lang, setLang] = useState<Lang>("en");
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
