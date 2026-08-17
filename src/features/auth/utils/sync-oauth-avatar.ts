import { updateCandidateProfile, updateHrProfile } from "@/features/auth/services/user.service";
import { resolveAvatarUrl } from "@/shared/utils/user-display";
import type { CurrentUser } from "@/shared/types/user";

function isHrRole(role: string | null | undefined): boolean {
  const normalized = (role ?? "").toUpperCase();
  return normalized.includes("HR") || normalized.includes("MANAGER");
}

/** Persist an OAuth provider's profile picture when the account has no avatar yet. */
export async function syncOAuthAvatarIfNeeded(
  picture: string | undefined,
  fallbackName: string,
  user: CurrentUser | null,
  role: string | null | undefined
): Promise<void> {
  const trimmedPicture = picture?.trim();
  if (!trimmedPicture || resolveAvatarUrl(user)) return;

  const fullName = user?.fullName || fallbackName || user?.email?.split("@")[0] || "User";

  if (isHrRole(role ?? user?.role)) {
    await updateHrProfile({ fullName, avatarUrl: trimmedPicture });
  } else {
    await updateCandidateProfile({ fullName, avatarUrl: trimmedPicture });
  }
}
