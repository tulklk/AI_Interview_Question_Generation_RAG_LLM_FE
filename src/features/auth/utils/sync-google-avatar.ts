import { parseGoogleIdToken } from "@/features/auth/utils/google-id-token";
import { syncOAuthAvatarIfNeeded } from "@/features/auth/utils/sync-oauth-avatar";
import type { CurrentUser } from "@/shared/types/user";

/** Persist Google profile picture when the account has no avatar yet. */
export async function syncGoogleAvatarIfNeeded(
  idToken: string,
  user: CurrentUser | null,
  role: string | null | undefined
): Promise<void> {
  const claims = parseGoogleIdToken(idToken);
  const fallbackName = user?.fullName || claims.name || user?.email?.split("@")[0] || "User";
  await syncOAuthAvatarIfNeeded(claims.picture, fallbackName, user, role);
}
