"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en } from "@/core/i18n/en";
import { vi } from "@/core/i18n/vi";
import type { Translations } from "@/core/i18n/en";
import { cookieService } from "@/core/storage/cookie.service";

export type Lang = "en" | "vi";

/** localStorage + cookie cùng key để SSR (layout) đọc được ngôn ngữ đã chọn. */
const STORAGE_KEY = "hiregena-lang";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 năm — khớp theme cookie

/**
 * Reads the UI language outside React. Services and axios interceptors run
 * without context but still have to localize BE errors, which arrive in
 * Vietnamese regardless of the chosen language.
 */
export function getUiLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "vi" || v === "en" ? v : "en";
  } catch {
    return "en";
  }
}

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

function persistLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Safari private mode có thể chặn localStorage
  }
  cookieService.set(STORAGE_KEY, lang, {
    maxAgeSeconds: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "Lax",
  });
}

function htmlLang(lang: Lang): string {
  return lang === "vi" ? "vi-VN" : "en";
}

/**
 * Proxy fallback: khi dictionary vi (cache HMR) thiếu key mới, đọc từ en.
 * Cache proxy theo target để không tạo object mới mỗi lần access (tránh infinite useEffect).
 */
function withEnFallback(primary: Translations, fallback: Translations = en): Translations {
  const cache = new WeakMap<object, object>();

  const wrap = (target: unknown, fb: unknown): unknown => {
    if (!target || typeof target !== "object" || Array.isArray(target)) return target ?? fb;
    const cached = cache.get(target as object);
    if (cached) return cached;

    const proxy = new Proxy(target as object, {
      get(obj, prop, receiver) {
        if (typeof prop === "symbol") return Reflect.get(obj, prop, receiver);
        const value = Reflect.get(obj, prop, receiver);
        const fbVal =
          fb && typeof fb === "object" ? Reflect.get(fb as object, prop) : undefined;
        if (value === undefined) return fbVal;
        if (value && typeof value === "object" && !Array.isArray(value)) {
          return wrap(value, fbVal);
        }
        return value;
      },
    });
    cache.set(target as object, proxy);
    return proxy;
  };

  return wrap(primary, fallback) as Translations;
}

function dictFor(lang: Lang): Translations {
  return lang === "vi" ? withEnFallback(vi, en) : en;
}

export function LanguageProvider({
  children,
  initialLang = "en",
}: {
  children: ReactNode;
  /** Locale SSR đọc từ cookie — phải khớp HTML server để tránh hydration mismatch. */
  initialLang?: Lang;
}) {
  const safeInitial: Lang = isLang(initialLang) ? initialLang : "en";
  const [lang, setLangState] = useState<Lang>(safeInitial);

  // Đồng bộ localStorage → cookie sau hydrate.
  // Nếu stored khác SSR (user cũ chỉ có localStorage, chưa có cookie), trì hoãn
  // setState đến macrotask tiếp theo. Lý do: MarketplacePage nằm trong <Suspense>
  // (useSearchParams) nên hydrate trễ hơn LanguageProvider. Nếu đổi sang "vi"
  // trước khi boundary đó hydrate, React so HTML tiếng Anh với client tiếng Việt.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!isLang(saved)) {
      // Chưa có preference client — giữ locale SSR (cookie) và backfill localStorage.
      persistLang(safeInitial);
      return;
    }
    persistLang(saved);
    if (saved === safeInitial) return;

    const id = window.setTimeout(() => {
      setLangState(saved);
      document.documentElement.lang = htmlLang(saved);
    }, 0);
    return () => window.clearTimeout(id);
  }, [safeInitial]);

  const setLang = useCallback((l: Lang) => {
    persistLang(l);
    document.body.classList.add("lang-switching");
    window.setTimeout(() => {
      setLangState(l);
      document.documentElement.lang = htmlLang(l);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.body.classList.remove("lang-switching");
        });
      });
    }, 140);
  }, []);

  useEffect(() => {
    document.documentElement.lang = htmlLang(lang);
  }, [lang]);

  // `en`/`vi` nằm trong deps để HMR cập nhật dictionary khi sửa file i18n.
  const t = useMemo(() => dictFor(lang), [lang, en, vi]);

  const value = useMemo(
    () => ({ lang, setLang, t }),
    [lang, setLang, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
