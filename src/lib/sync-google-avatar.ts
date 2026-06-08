import { updateCandidateProfile, updateHrProfile } from "@/lib/api/user";
import { parseGoogleIdToken } from "@/lib/google-id-token";
import { fixUtf8Mojibake } from "@/lib/text-encoding";
import { resolveAvatarUrl } from "@/lib/user-display";
import type { CurrentUser } from "@/types/user";

function isHrRole(role: string | null | undefined): boolean {
  const normalized = (role ?? "").toUpperCase();
  return normalized.includes("HR") || normalized.includes("MANAGER");
}

/**
 * After Google OAuth, persist the correct display name and avatar from the ID token.
 * Name is always refreshed from Google when available (fixes backend mojibake).
 */
export async function syncGoogleAvatarIfNeeded(
  idToken: string,
  user: CurrentUser | null,
  role: string | null | undefined
): Promise<void> {
  const claims = parseGoogleIdToken(idToken);
  const googleName = claims.name?.trim();
  const picture = claims.picture?.trim();
  const avatarNeedsSync = Boolean(picture && !resolveAvatarUrl(user));

  if (!googleName && !avatarNeedsSync) return;

  const storedName = fixUtf8Mojibake(user?.fullName ?? "");
  const fullName =
    googleName ||
    storedName ||
    user?.email?.split("@")[0] ||
    "User";

  const payload: { fullName: string; avatarUrl?: string } = { fullName };
  if (avatarNeedsSync && picture) {
    payload.avatarUrl = picture;
  }

  if (isHrRole(role ?? user?.role)) {
    await updateHrProfile(payload);
  } else {
    await updateCandidateProfile(payload);
  }
}
