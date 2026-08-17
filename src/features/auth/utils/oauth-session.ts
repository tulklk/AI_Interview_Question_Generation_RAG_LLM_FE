import { setAuth, setAuthTokens, setUserRole, extractRole } from "@/core/auth/permissions";

/** Persists tokens/role from an OAuth login response (Google, GitHub, ...). */
export function persistOAuthSession(data: unknown): string | null {
  const d = data as Record<string, unknown>;
  const src = (typeof d.data === "object" && d.data ? d.data : d) as Record<string, unknown>;
  const accessToken = (src.accessToken ?? src.access_token ?? src.token) as string | undefined;
  const refreshToken = (src.refreshToken ?? src.refresh_token) as string | undefined;
  if (accessToken) setAuthTokens(accessToken, refreshToken);
  setAuth();
  const role = extractRole(data);
  if (role) setUserRole(role);
  return role;
}
