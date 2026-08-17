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
/** Đồng bộ với RootLayout — SSR đọc cookie này để set class dark, không cần <script> FOUC. */
const RESOLVED_COOKIE = "hiregena-theme-resolved";

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

function writeResolvedCookie(theme: ThemeMode) {
  try {
    // 1 năm — Path=/ để layout SSR luôn đọc được
    document.cookie = `${RESOLVED_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // ignore
  }
}

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

  writeResolvedCookie(theme);

  if (isDark === shouldBeDark) {
    // Keep colorScheme in sync but skip the class write / reflow.
    root.style.colorScheme = theme;
    return;
  }

  // Disable transitions during the switch to avoid a page-wide reflow/jank.
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{transition:none !important}"
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
  return "light"; // default for first-time visitors
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
  // DOM-sync effect does not clobber SSR cookie class before we know preference.
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
    // Ensure DOM + cookie match the resolved theme immediately.
    applyTheme(resolved);
  }, []);

  // ── Follow OS changes only while preference is "system" ────────────────────
  // NOTE: Do NOT call onChange() on mount here. The initial theme is already
  // resolved by the read effect above via resolveTheme(), which checks the OS
  // media query. Calling onChange() here introduces a stale-closure race:
  // this effect runs with the initial `preference = "system"` in its closure
  // even when the read effect has already updated preference to "dark"/"light",
  // causing the OS-light condition to briefly override a manually-set dark
  // theme and produce a white flash. This effect only wires up the listener
  // for *future* OS preference changes.
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setThemeState(mq.matches ? "dark" : "light");
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
