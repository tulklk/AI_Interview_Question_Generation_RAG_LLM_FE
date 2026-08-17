import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { loginWithGithub, verifyGithubOAuth } from "@/features/auth/services/auth.service";
import type { GithubLoginRequest, GithubVerifyResponse, LoginResponse } from "@/features/auth/types/auth";
import { getRoleRedirect } from "@/core/auth/permissions";
import { syncOAuthAvatarIfNeeded } from "@/features/auth/utils/sync-oauth-avatar";
import { persistOAuthSession } from "@/features/auth/utils/oauth-session";
import { resolveAvatarUrl } from "@/shared/utils/user-display";
import { setCachedUserProfile } from "@/core/storage/user-profile-cache";
import type { CurrentUser } from "@/shared/types/user";

export interface GithubClaims {
  email: string;
  name: string;
  picture: string;
}

export function claimsFromGithubVerify(verify: GithubVerifyResponse): GithubClaims {
  return {
    email: verify.email,
    name: verify.name || verify.email.split("@")[0] || "",
    picture: verify.picture?.trim() ?? "",
  };
}

export async function verifyGithubCode(
  code: string,
  options?: { intendedRole?: string }
): Promise<GithubVerifyResponse> {
  return verifyGithubOAuth({ code, ...options });
}

export async function completeGithubLogin(
  code: string,
  payload?: Omit<GithubLoginRequest, "code">
): Promise<{ data: LoginResponse; role: string | null }> {
  const data = await loginWithGithub({ code, ...payload });
  const role = persistOAuthSession(data);
  return { data, role };
}

export async function finishGithubAuth(
  router: AppRouterInstance,
  refreshUser: () => Promise<CurrentUser | null>,
  claims: GithubClaims,
  role: string | null
): Promise<void> {
  let profile = await refreshUser();
  try {
    await syncOAuthAvatarIfNeeded(claims.picture, claims.name, profile, role);
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
