import type { CurrentUser } from "@/types/user";

export function getInitials(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "??";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function resolveAvatarUrl(
  user: Pick<CurrentUser, "avatarUrl" | "candidateProfile" | "hrProfile"> | null | undefined
): string | null {
  if (!user) return null;

  const candidates = [
    user.avatarUrl,
    user.candidateProfile?.avatarUrl,
    user.hrProfile?.avatarUrl,
  ];

  for (const url of candidates) {
    if (typeof url === "string" && url.trim()) return url.trim();
  }

  return null;
}
