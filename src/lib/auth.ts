import { clearTokenStorage, getAccessToken } from "@/lib/auth-tokens";
import { clearCachedUserProfile } from "@/lib/user-profile-cache";

export { getAccessToken, getRefreshToken, setAuthTokens } from "@/lib/auth-tokens";

const KEY = "interviewai_auth";
const ROLE_KEY = "interviewai_user_role";

export const setAuth = () => {
  if (typeof window !== "undefined") localStorage.setItem(KEY, "true");
};

export const clearAuth = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  localStorage.removeItem(ROLE_KEY);
  clearTokenStorage();
  clearCachedUserProfile();
};

/** True if legacy mock flag is set or a JWT access token exists. */
export const isAuthenticated = () => {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(KEY) === "true") return true;
  return Boolean(getAccessToken());
};

export const setUserRole = (role: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROLE_KEY, role);
};

export const getUserRole = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROLE_KEY);
};

export function getRoleRedirect(role: string | null): string {
  const r = (role ?? "").toUpperCase();
  if (r.includes("ADMIN")) return "/admin/dashboard";
  if (r.includes("HR")) return "/hr/dashboard";
  return "/jobseeker";
}

export function extractRole(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const src =
    typeof root.data === "object" && root.data
      ? (root.data as Record<string, unknown>)
      : root;

  if (typeof src.role === "string") return src.role;

  const token = (src.accessToken ?? src.access_token ?? src.token) as
    | string
    | undefined;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return (payload.role ?? payload.Role ?? null) as string | null;
    } catch {
      return null;
    }
  }
  return null;
}
