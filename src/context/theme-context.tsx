"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark";
export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "hiregena-theme";

interface ThemeContextValue {
  /** Resolved theme currently applied to the document. */
  theme: ThemeMode;
  /** User preference including system-follow-OS. */
  preference: ThemePreference;
  setTheme: (theme: ThemeMode) => void;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  preference: "system",
  setTheme: () => {},
  setPreference: () => {},
  toggleTheme: () => {},
});

/**
 * Applies the theme to <html>. Transitions are momentarily disabled so that
 * toggling does not animate every color on the page at once (which caused jank).
 * This is the ONLY place that mutates the DOM theme — it is always called from
 * an effect that derives from state, guaranteeing DOM and state never desync.
 */
function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  const shouldBeDark = theme === "dark";
  if (isDark === shouldBeDark) {
    // Keep colorScheme in sync but skip the class write / reflow.
    root.style.colorScheme = theme;
    return;
  }

  // Disable transitions during the switch to avoid a page-wide reflow/jank.
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{transition:none !important;animation:none !important}"
    )
  );
  document.head.appendChild(style);

  root.classList.toggle("dark", shouldBeDark);
  root.style.colorScheme = theme;

  // Force a reflow so the disabling style takes effect before we remove it.
  void window.getComputedStyle(style).opacity;
  requestAnimationFrame(() => {
    document.head.removeChild(style);
  });
}

function parsePreference(saved: string | null): ThemePreference {
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  return "system";
}

function resolveTheme(preference: ThemePreference): ThemeMode {
  if (preference === "dark") return "dark";
  if (preference === "light") return "light";
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [theme, setThemeState] = useState<ThemeMode>("light");
  // Tracks whether the initial read from localStorage has completed, so the
  // DOM-sync effect does not clobber the FOUC script's class before we know
  // the user's real preference.
  const hydratedRef = useRef(false);

  // ── Single source of truth: DOM is always derived from `theme` state ───────
  useEffect(() => {
    if (!hydratedRef.current) return;
    applyTheme(theme);
  }, [theme]);

  // ── Initial read from storage (runs once) ──────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const pref = parsePreference(saved);
    const resolved = resolveTheme(pref);
    setPreferenceState(pref);
    setThemeState(resolved);
    hydratedRef.current = true;
    // Ensure DOM matches the resolved theme immediately (the [theme] effect is
    // skipped on this first pass because hydratedRef was still false).
    applyTheme(resolved);
  }, []);

  // ── Follow OS changes only while preference is "system" ────────────────────
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setThemeState(mq.matches ? "dark" : "light");
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  // ── Cross-tab sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || e.newValue == null) return;
      const pref = parsePreference(e.newValue);
      setPreferenceState(pref);
      setThemeState(resolveTheme(pref));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, pref);
    setPreferenceState(pref);
    setThemeState(resolveTheme(pref));
  }, []);

  const setTheme = useCallback(
    (next: ThemeMode) => setPreference(next),
    [setPreference]
  );

  const toggleTheme = useCallback(() => {
    // Compute next from current resolved theme, then route through setPreference.
    // No side effects inside a state updater → DOM and state stay consistent.
    setPreference(theme === "dark" ? "light" : "dark");
  }, [theme, setPreference]);

  return (
    <ThemeContext.Provider
      value={{ theme, preference, setTheme, setPreference, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
