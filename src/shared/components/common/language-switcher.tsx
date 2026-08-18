"use client";

import { useState, useEffect } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage, type Lang } from "@/shared/providers/language-context";
import { useOverlayTransition } from "@/shared/hooks/use-overlay-transition";

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
  const { mounted, exiting } = useOverlayTransition(open, 220);
  // Prevent hydration mismatch: lang comes from localStorage (client-only)
  const [clientMounted, setClientMounted] = useState(false);
  useEffect(() => { setClientMounted(true); }, []);

  const active = LANGUAGES.find((l) => l.code === lang)!;

  function closeMenu() {
    if (exiting) return;
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
          variant === "ghost"
            ? "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
            : "text-gray-600 hover:text-gray-800 bg-white border border-gray-200 hover:border-gray-300 shadow-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white dark:hover:border-gray-600"
        )}
      >
        <Globe size={14} className="shrink-0" />
        {/* Render flag/code only on client to avoid server/client lang mismatch */}
        <span className="hidden sm:inline" suppressHydrationWarning>
          {clientMounted ? `${active.flag} ${active.code.toUpperCase()}` : ""}
        </span>
        <span className="sm:hidden" suppressHydrationWarning>
          {clientMounted ? active.flag : ""}
        </span>
        <ChevronDown
          size={12}
          className={cn("transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {mounted && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} />
          <div
            className={cn(
              "absolute right-0 top-full mt-1.5 z-50 w-44 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg py-1 origin-top-right",
              exiting ? "animate-fade-up-out" : "animate-fade-up"
            )}
          >
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
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
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
