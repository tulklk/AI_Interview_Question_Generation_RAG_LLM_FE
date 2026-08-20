"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { en } from "@/core/i18n/en";
import type { Translations } from "@/core/i18n/en";

// useLayoutEffect runs synchronously after DOM commit and before browser paint.
// On the server (SSR) it degrades to useEffect (which doesn't run during SSR).
// This lets us call setIsHydrated(true) in the layout phase so the update
// is committed BEFORE any useEffect (where the dict loader runs).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

function getStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem(STORAGE_KEY);
  return isLang(saved) ? saved : "en";
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
  // Always start with "en" on both server AND first client render to avoid
  // hydration mismatch. The stored preference is read in a useEffect (after
  // hydration) so server-rendered HTML and the first client render are in sync.
  const [lang, setLangState] = useState<Lang>("en");
  // Giữ riêng bản vi đã load — luôn đọc `en` trực tiếp từ module để HMR không giữ dictionary cũ
  const [viDict, setViDict] = useState<Translations | null>(null);
  // Guard: `t` stays as `en` until the first useEffect fires (after hydration).
  // This prevents React 19 concurrent-mode from seeing a mismatch between
  // SSR (always "en") and the first client render (might already be "vi"
  // in some fast-hydration scenarios).
  const [isHydrated, setIsHydrated] = useState(false);

  // STEP 1 — Mark hydration complete synchronously (layout phase, before paint).
  //
  // WHY useLayoutEffect and not useEffect:
  //   React 18 schedules useEffect commits via MessageChannel (macrotask).
  //   Promise.then() is a microtask — it runs BEFORE any MessageChannel task.
  //   If we put setIsHydrated(true) in useEffect, the race is:
  //     a. setIsHydrated(true) → queued as MessageChannel macrotask
  //     b. loadDictionary("vi").then() microtask fires first
  //     c. setLangState("vi") + setViDict(dict) also queued
  //     d. MessageChannel fires: React batches ALL → commits Vietnamese → MISMATCH ❌
  //
  //   useLayoutEffect fires SYNCHRONOUSLY after DOM commit and before paint.
  //   State updates inside useLayoutEffect are flushed before any useEffect runs,
  //   so isHydrated=true commits in its own render → English ✅ — THEN useEffect
  //   loads the dictionary in a separate, safe commit → Vietnamese ✅.
  useIsomorphicLayoutEffect(() => {
    setIsHydrated(true);
  }, []);

  // STEP 2 — After hydration is confirmed (isHydrated already true from layout),
  // load the stored language preference. This runs after browser paint, so it
  // never competes with the hydration commit.
  useEffect(() => {
    const stored = getStoredLang();
    if (stored === "en") {
      document.documentElement.lang = "en";
      return;
    }
    let cancelled = false;
    loadDictionary(stored).then((dict) => {
      if (cancelled) return;
      setLangState(stored);
      document.documentElement.lang = stored === "vi" ? "vi-VN" : "en";
      if (stored === "vi") setViDict(dict);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    document.documentElement.lang = lang === "vi" ? "vi-VN" : "en";
    if (lang !== "vi") return;

    let cancelled = false;
    loadDictionary("vi").then((dict) => {
      if (!cancelled) setViDict(dict);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

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

  // en luôn lấy từ import mới nhất; vi merge fallback en để key mới không crash khi HMR giữ cache cũ.
  // Guard: trả về `en` cho đến khi hydration hoàn tất (`isHydrated = true`).
  // Điều này đảm bảo lần render đầu tiên phía client luôn khớp với SSR (English),
  // tránh React 19 hydration mismatch dù language đã được đọc từ localStorage.
  const t = useMemo(() => {
    if (!isHydrated) return en;
    if (lang === "vi" && viDict) return withEnFallback(viDict, en);
    return en;
  }, [lang, viDict, isHydrated]);

  // Expose `lang` as "en" until hydration is done, same as `t`, so UI
  // that branches on `lang === "vi"` also stays stable during hydration.
  const value = useMemo(
    () => ({ lang: isHydrated ? lang : ("en" as Lang), setLang, t }),
    [lang, setLang, t, isHydrated],
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
