/**
 * Minimal browser cookie helper. Tokens currently live in localStorage; this
 * service exists for future use (e.g. SSR-readable auth) and keeps cookie
 * access centralized.
 */

interface CookieOptions {
  maxAgeSeconds?: number;
  path?: string;
  sameSite?: "Lax" | "Strict" | "None";
  secure?: boolean;
}

function isBrowser(): boolean {
  return typeof document !== "undefined";
}

export const cookieService = {
  get(name: string): string | null {
    if (!isBrowser()) return null;
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1")}=([^;]*)`)
    );
    return match ? decodeURIComponent(match[1]) : null;
  },

  set(name: string, value: string, options: CookieOptions = {}): void {
    if (!isBrowser()) return;
    const { maxAgeSeconds, path = "/", sameSite = "Lax", secure } = options;
    let cookie = `${name}=${encodeURIComponent(value)}; path=${path}; samesite=${sameSite}`;
    if (typeof maxAgeSeconds === "number") cookie += `; max-age=${maxAgeSeconds}`;
    if (secure) cookie += "; secure";
    document.cookie = cookie;
  },

  remove(name: string, path = "/"): void {
    if (!isBrowser()) return;
    document.cookie = `${name}=; path=${path}; max-age=0`;
  },
};
