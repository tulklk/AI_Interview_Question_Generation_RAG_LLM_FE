"use client";

import { useState } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage, type Lang } from "@/context/language-context";

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
];

interface LanguageSwitcherProps {
  variant?: "light" | "ghost";
}

export function LanguageSwitcher({ variant = "ghost" }: LanguageSwitcherProps) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);

  const active = LANGUAGES.find((l) => l.code === lang)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-medium transition-colors",
          variant === "ghost"
            ? "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            : "text-gray-600 hover:text-gray-800 bg-white border border-gray-200 hover:border-gray-300 shadow-sm"
        )}
      >
        <Globe size={14} className="shrink-0" />
        <span className="hidden sm:inline">
          {active.flag} {active.code.toUpperCase()}
        </span>
        <span className="sm:hidden">{active.flag}</span>
        <ChevronDown
          size={12}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-50 w-44 bg-white rounded-xl border border-gray-200 shadow-lg py-1 animate-fade-up">
            {LANGUAGES.map((language) => (
              <button
                key={language.code}
                onClick={() => {
                  setLang(language.code);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors",
                  lang === language.code
                    ? "text-[#6c47ff] bg-[#6c47ff]/5 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <span className="text-base">{language.flag}</span>
                <span>{language.label}</span>
                {lang === language.code && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#6c47ff]" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
