"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function parsePreference(saved: string | null): ThemePreference {
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  return "system";
}

function resolveTheme(preference: ThemePreference): ThemeMode {
  if (preference === "dark") return "dark";
  if (preference === "light") return "light";
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const pref = parsePreference(saved);
    const resolved = resolveTheme(pref);
    setPreferenceState(pref);
    setThemeState(resolved);
    applyTheme(resolved);
  }, []);

  useEffect(() => {
    if (preference !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const resolved = mq.matches ? "dark" : "light";
      setThemeState(resolved);
      applyTheme(resolved);
    };

    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || e.newValue == null) return;
      const pref = parsePreference(e.newValue);
      const resolved = resolveTheme(pref);
      setPreferenceState(pref);
      setThemeState(resolved);
      applyTheme(resolved);
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    localStorage.setItem(STORAGE_KEY, pref);
    const resolved = resolveTheme(pref);
    setThemeState(resolved);
    applyTheme(resolved);
  }, []);

  const setTheme = useCallback(
    (next: ThemeMode) => {
      setPreference(next);
    },
    [setPreference]
  );

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: ThemeMode = current === "dark" ? "light" : "dark";
      setPreferenceState(next);
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, preference, setTheme, setPreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
