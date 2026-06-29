/**
 * Safe localStorage wrapper. Guards against SSR (no window) and quota/parse errors.
 * Domain-specific caches should use this instead of touching localStorage directly.
 */

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export const localStorageService = {
  get(key: string): string | null {
    if (!isBrowser()) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key: string, value: string): void {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* ignore quota / disabled storage */
    }
  },

  remove(key: string): void {
    if (!isBrowser()) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },

  getJSON<T>(key: string): T | null {
    const raw = this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  setJSON<T>(key: string, value: T): void {
    try {
      this.set(key, JSON.stringify(value));
    } catch {
      /* ignore serialization errors */
    }
  },
};
