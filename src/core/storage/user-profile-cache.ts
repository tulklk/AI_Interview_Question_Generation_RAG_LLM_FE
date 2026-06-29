import { localStorageService } from "@/core/storage/local-storage.service";

export interface CachedUserProfile {
  fullName: string;
  email: string;
  avatarUrl?: string | null;
}

const KEY = "interviewai_user_profile";

export function getCachedUserProfile(): CachedUserProfile | null {
  const parsed = localStorageService.getJSON<CachedUserProfile>(KEY);
  if (!parsed) return null;
  if (
    typeof parsed.fullName === "string" &&
    typeof parsed.email === "string" &&
    (parsed.fullName || parsed.email)
  ) {
    return parsed;
  }
  return null;
}

export function setCachedUserProfile(profile: CachedUserProfile): void {
  localStorageService.setJSON(KEY, profile);
}

export function clearCachedUserProfile(): void {
  localStorageService.remove(KEY);
}
