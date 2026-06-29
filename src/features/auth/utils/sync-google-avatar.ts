import { updateCandidateProfile, updateHrProfile } from "@/features/auth/services/user.service";
import { parseGoogleIdToken } from "@/features/auth/utils/google-id-token";
import { resolveAvatarUrl } from "@/shared/utils/user-display";
import type { CurrentUser } from "@/shared/types/user";

function isHrRole(role: string | null | undefined): boolean {
  const normalized = (role ?? "").toUpperCase();
  return normalized.includes("HR") || normalized.includes("MANAGER");
}

/** Persist Google profile picture when the account has no avatar yet. */
export async function syncGoogleAvatarIfNeeded(
  idToken: string,
  user: CurrentUser | null,
  role: string | null | undefined
): Promise<void> {
  const picture = parseGoogleIdToken(idToken).picture?.trim();
  if (!picture || resolveAvatarUrl(user)) return;

  const fullName =
    user?.fullName ||
    parseGoogleIdToken(idToken).name ||
    user?.email?.split("@")[0] ||
    "User";

  if (isHrRole(role ?? user?.role)) {
    await updateHrProfile({ fullName, avatarUrl: picture });
  } else {
    await updateCandidateProfile({ fullName, avatarUrl: picture });
  }
}
