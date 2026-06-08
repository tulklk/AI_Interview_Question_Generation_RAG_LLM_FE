import { sanitizeDisplayName } from "@/lib/text-encoding";
import type { CachedUserProfile } from "@/types/user";

const KEY = "interviewai_user_profile";

export function getCachedUserProfile(): CachedUserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedUserProfile;
    if (
      typeof parsed.fullName === "string" &&
      typeof parsed.email === "string" &&
      (parsed.fullName || parsed.email)
    ) {
      return {
        ...parsed,
        fullName: sanitizeDisplayName(parsed.fullName),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function setCachedUserProfile(profile: CachedUserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    KEY,
    JSON.stringify({
      ...profile,
      fullName: sanitizeDisplayName(profile.fullName),
    })
  );
}

export function clearCachedUserProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
