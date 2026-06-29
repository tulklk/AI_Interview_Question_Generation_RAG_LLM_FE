import { apiClient } from "@/core/api/http-client";
import type { UpdateCandidateProfileRequest } from "@/features/auth/types/auth";
import type {
  CandidateProfileData,
  ChangePasswordRequest,
  CurrentUser,
  HrProfileData,
  UpdateHrProfileRequest,
} from "@/shared/types/user";

function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

function pickOptionalString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string") return val.trim();
  }
  return "";
}

function pickStringArray(obj: Record<string, unknown>, ...keys: string[]): string[] {
  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val)) {
      return val.filter((item): item is string => typeof item === "string");
    }
  }
  return [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return null;
}

function normalizeCandidateProfile(
  src: Record<string, unknown>,
  rootFullName: string
): CandidateProfileData | undefined {
  const nested =
    asRecord(src.candidateProfile) ??
    asRecord(src.CandidateProfile);

  const profile = nested ?? src;
  const fullName =
    pickString(profile, "fullName", "FullName") || rootFullName;

  const hasFields =
    fullName ||
    pickOptionalString(profile, "targetRole", "TargetRole") ||
    pickOptionalString(profile, "seniorityLevel", "SeniorityLevel") ||
    pickStringArray(profile, "techStack", "TechStack").length > 0 ||
    pickOptionalString(profile, "bio", "Bio") ||
    pickOptionalString(profile, "phoneNumber", "PhoneNumber");

  if (!hasFields && !nested) return undefined;

  const avatarRaw = profile.avatarUrl ?? profile.AvatarUrl;
  return {
    fullName,
    targetRole: pickOptionalString(profile, "targetRole", "TargetRole") || undefined,
    seniorityLevel:
      pickOptionalString(profile, "seniorityLevel", "SeniorityLevel") || undefined,
    techStack: pickStringArray(profile, "techStack", "TechStack"),
    phoneNumber: pickOptionalString(profile, "phoneNumber", "PhoneNumber") || undefined,
    avatarUrl:
      typeof avatarRaw === "string" ? avatarRaw : avatarRaw === null ? null : undefined,
    linkedInUrl: pickOptionalString(profile, "linkedInUrl", "LinkedInUrl") || undefined,
    githubUrl: pickOptionalString(profile, "githubUrl", "GithubUrl") || undefined,
    bio: pickOptionalString(profile, "bio", "Bio") || undefined,
  };
}

function normalizeHrProfile(
  src: Record<string, unknown>,
  rootFullName: string
): HrProfileData | undefined {
  const nested = asRecord(src.hrProfile) ?? asRecord(src.HrProfile);
  const profile = nested ?? src;
  const fullName =
    pickString(profile, "fullName", "FullName") || rootFullName;

  const hasFields =
    fullName ||
    pickOptionalString(profile, "companyName", "CompanyName") ||
    pickOptionalString(profile, "jobTitle", "JobTitle") ||
    pickOptionalString(profile, "bio", "Bio") ||
    pickOptionalString(profile, "phoneNumber", "PhoneNumber") ||
    nested;

  if (!hasFields && !nested) return undefined;

  const avatarRaw = profile.avatarUrl ?? profile.AvatarUrl;
  const companyId = pickOptionalString(profile, "companyId", "CompanyId");

  return {
    fullName,
    companyId: companyId || undefined,
    companyName: pickOptionalString(profile, "companyName", "CompanyName") || undefined,
    jobTitle: pickOptionalString(profile, "jobTitle", "JobTitle") || undefined,
    phoneNumber: pickOptionalString(profile, "phoneNumber", "PhoneNumber") || undefined,
    avatarUrl:
      typeof avatarRaw === "string" ? avatarRaw : avatarRaw === null ? null : undefined,
    linkedInUrl: pickOptionalString(profile, "linkedInUrl", "LinkedInUrl") || undefined,
    bio: pickOptionalString(profile, "bio", "Bio") || undefined,
  };
}

function normalizeCurrentUser(raw: unknown): CurrentUser | null {
  if (!raw || typeof raw !== "object") return null;

  const root = raw as Record<string, unknown>;
  const src =
    typeof root.data === "object" && root.data
      ? (root.data as Record<string, unknown>)
      : root;

  const fullName = pickString(src, "fullName", "FullName", "name", "Name");
  const email = pickString(src, "email", "Email");
  if (!fullName && !email) return null;

  const resolvedFullName = fullName || email.split("@")[0] || "User";
  const id = pickString(src, "id", "Id") || undefined;
  const role = pickString(src, "role", "Role") || undefined;
  const avatarRaw = src.avatarUrl ?? src.AvatarUrl;
  const avatarUrl =
    typeof avatarRaw === "string" ? avatarRaw : avatarRaw === null ? null : undefined;

  const candidateProfile = normalizeCandidateProfile(src, resolvedFullName);
  const hrProfile = normalizeHrProfile(src, resolvedFullName);

  return {
    id,
    fullName: resolvedFullName,
    email,
    role,
    avatarUrl,
    candidateProfile,
    hrProfile,
  };
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const res = await apiClient.get("/api/users/me");
  const user = normalizeCurrentUser(res.data);
  if (!user) {
    throw new Error("Invalid user profile response");
  }
  return user;
}

export async function updateCandidateProfile(
  data: UpdateCandidateProfileRequest
): Promise<void> {
  await apiClient.patch("/api/users/me/candidate-profile", data);
}

export async function updateHrProfile(data: UpdateHrProfileRequest): Promise<void> {
  await apiClient.patch("/api/users/me/hr-profile", data);
}

export async function changePassword(data: ChangePasswordRequest): Promise<void> {
  await apiClient.patch("/api/users/me/password", data);
}
