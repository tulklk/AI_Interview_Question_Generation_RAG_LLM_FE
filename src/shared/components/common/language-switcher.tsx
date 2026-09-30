"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage, type Lang } from "@/shared/providers/language-context";
import { useOverlayTransition } from "@/shared/hooks/use-overlay-transition";

const LANGUAGE_CODES: Lang[] = ["en", "vi"];

const LABELS: Record<Lang, Record<Lang, string>> = {
  vi: { vi: "Tiếng Việt", en: "Tiếng Anh" },
  en: { vi: "Vietnamese", en: "English" },
};

function UkFlag({ className }: { className?: string }) {
  const clipId = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 60 30" className={className} aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <path d="M0,0 h60 v30 h-60 z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path d="M0,0 h60 v30 h-60 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

function VnFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden>
      <rect width="30" height="20" fill="#DA251D" />
      <path
        fill="#FFCD00"
        d="M15 4.2l1.45 4.15 4.4.1-3.5 2.7 1.28 4.2L15 12.8l-3.63 2.55 1.28-4.2-3.5-2.7 4.4-.1z"
      />
    </svg>
  );
}

function LangFlag({ code, className }: { code: Lang; className?: string }) {
  return code === "en" ? <UkFlag className={className} /> : <VnFlag className={className} />;
}

const flagClass = "h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10";

interface LanguageSwitcherProps {
  variant?: "light" | "ghost";
}

export function LanguageSwitcher({ variant = "ghost" }: LanguageSwitcherProps) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const { mounted, exiting } = useOverlayTransition(open, 220);
  const [clientMounted, setClientMounted] = useState(false);
  useEffect(() => { setClientMounted(true); }, []);

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
        <span className="inline-flex" suppressHydrationWarning>
          {clientMounted ? <LangFlag code={lang} className={flagClass} /> : null}
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
              "absolute right-0 top-full mt-1.5 z-50 w-48 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg py-1 origin-top-right",
              exiting ? "animate-fade-up-out" : "animate-fade-up"
            )}
          >
            {LANGUAGE_CODES.map((code) => (
              <button
                key={code}
                onClick={() => {
                  setLang(code);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors",
                  lang === code
                    ? "text-[#6c47ff] bg-[#6c47ff]/5 font-semibold"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                )}
              >
                <LangFlag code={code} className={flagClass} />
                <span>{LABELS[lang][code]}</span>
                {lang === code && (
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
