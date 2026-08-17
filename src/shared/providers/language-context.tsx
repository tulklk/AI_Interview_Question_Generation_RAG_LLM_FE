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
  // Giữ riêng bản vi đã load — luôn đọc `en` trực tiếp từ module để HMR không giữ dictionary cũ
  const [viDict, setViDict] = useState<Translations | null>(null);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l);
    document.body.classList.add("lang-switching");
    const timer = setTimeout(() => {
      loadDictionary(l).then((dict) => {
        setLangState(l);
        document.documentElement.lang = l === "vi" ? "vi-VN" : "en";
        if (l === "vi") setViDict(dict);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            document.body.classList.remove("lang-switching");
          });
        });
      });
    }, 140);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLang(saved) && saved !== "en") {
      loadDictionary(saved).then((dict) => {
        setLangState(saved);
        document.documentElement.lang = saved === "vi" ? "vi-VN" : "en";
        setViDict(dict);
      });
    }
  }, []);

  // Dev HMR: khi vi.ts (hoặc en.ts) thêm key mới, reload dictionary nếu đang dùng tiếng Việt.
  // `en` được import tĩnh → HMR tạo reference mới mỗi lần bất kỳ i18n file thay đổi,
  // khiến effect này re-run mà không cần user chuyển ngôn ngữ qua lại.
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || lang !== "vi") return;
    let cancelled = false;
    loadDictionary("vi").then((dict) => {
      if (!cancelled) setViDict(dict);
    });
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, en]);

  // en luôn lấy từ import mới nhất; vi merge fallback en để key mới không crash khi HMR giữ cache cũ
  const t = useMemo(() => {
    if (lang === "vi" && viDict) return withEnFallback(viDict, en);
    return en;
  }, [lang, viDict]);

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
