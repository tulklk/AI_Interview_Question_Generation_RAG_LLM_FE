import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { loginWithGoogle, verifyGoogleOAuth } from "@/lib/api/auth";
import type { GoogleLoginRequest, GoogleVerifyResponse, LoginResponse } from "@/types/auth";
import {
  setAuth,
  setAuthTokens,
  setUserRole,
  extractRole,
  getRoleRedirect,
} from "@/lib/auth";
import { parseGoogleIdToken } from "@/lib/google-id-token";
import { syncGoogleAvatarIfNeeded } from "@/lib/sync-google-avatar";
import { resolveAvatarUrl } from "@/lib/user-display";
import { setCachedUserProfile } from "@/lib/user-profile-cache";
import type { CurrentUser } from "@/types/user";

export interface GoogleClaims {
  email: string;
  name: string;
  picture: string;
}

export function parseGoogleClaims(credential: string): GoogleClaims {
  const claims = parseGoogleIdToken(credential);
  const email = claims.email ?? "";
  return {
    email,
    name: claims.name ?? email.split("@")[0] ?? "",
    picture: claims.picture?.trim() ?? "",
  };
}

export async function verifyGoogleToken(
  idToken: string,
  options?: { intendedRole?: string }
): Promise<GoogleVerifyResponse> {
  return verifyGoogleOAuth({ idToken, ...options });
}

export function persistGoogleSession(data: unknown): string | null {
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

export async function completeGoogleLogin(
  idToken: string,
  payload?: Omit<GoogleLoginRequest, "idToken">
): Promise<{ data: LoginResponse; role: string | null }> {
  const data = await loginWithGoogle({ idToken, ...payload });
  const role = persistGoogleSession(data);
  return { data, role };
}

export async function finishGoogleAuth(
  router: AppRouterInstance,
  refreshUser: () => Promise<CurrentUser | null>,
  claims: GoogleClaims,
  idToken: string,
  role: string | null
): Promise<void> {
  let profile = await refreshUser();
  try {
    await syncGoogleAvatarIfNeeded(idToken, profile, role);
    profile = await refreshUser();
  } catch {
    // Avatar sync is best-effort.
  }

  setCachedUserProfile({
    fullName: claims.name,
    email: claims.email,
    avatarUrl: resolveAvatarUrl(profile) ?? (claims.picture || null),
  });

  router.push(getRoleRedirect(role));
}
