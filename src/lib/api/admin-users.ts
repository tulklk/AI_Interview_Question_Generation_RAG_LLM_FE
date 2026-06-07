import { apiClient } from "@/lib/api-client";
import { normalizeAdminRoleKey } from "@/lib/admin-user-display";
import type {
  AdminUserDetail,
  AdminUserListItem,
  AdminUsersListParams,
  PaginatedResult,
} from "@/types/admin-user";
import type { CandidateProfileData, HrProfileData } from "@/types/user";

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

function pickBoolean(obj: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "boolean") return val;
  }
  return undefined;
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
  const nested = asRecord(src.candidateProfile) ?? asRecord(src.CandidateProfile);
  const profile = nested ?? src;
  const fullName = pickString(profile, "fullName", "FullName") || rootFullName;

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
  const fullName = pickString(profile, "fullName", "FullName") || rootFullName;

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

function normalizeListItem(raw: unknown): AdminUserListItem | null {
  if (!raw || typeof raw !== "object") return null;

  const root = raw as Record<string, unknown>;
  const src =
    typeof root.data === "object" && root.data
      ? (root.data as Record<string, unknown>)
      : root;

  const id = pickString(src, "id", "Id");
  const email = pickString(src, "email", "Email");
  const fullName = pickString(src, "fullName", "FullName", "name", "Name");
  if (!id && !email) return null;

  const resolvedFullName = fullName || email.split("@")[0] || "User";
  const role = pickString(src, "role", "Role");
  const isActive = pickBoolean(src, "isActive", "IsActive") ?? true;
  const emailVerified = pickBoolean(src, "emailVerified", "EmailVerified", "isEmailVerified", "IsEmailVerified");
  const createdAt =
    pickOptionalString(src, "createdAt", "CreatedAt", "createdDate", "CreatedDate") || undefined;
  const avatarRaw = src.avatarUrl ?? src.AvatarUrl;
  const avatarUrl =
    typeof avatarRaw === "string" ? avatarRaw : avatarRaw === null ? null : undefined;

  return {
    id: id || email,
    fullName: resolvedFullName,
    email,
    role,
    roleKey: normalizeAdminRoleKey(role),
    isActive,
    emailVerified,
    createdAt,
    avatarUrl,
  };
}

function normalizeUserDetail(raw: unknown): AdminUserDetail | null {
  const base = normalizeListItem(raw);
  if (!base) return null;

  const root = raw as Record<string, unknown>;
  const src =
    typeof root.data === "object" && root.data
      ? (root.data as Record<string, unknown>)
      : root;

  const candidateProfile = normalizeCandidateProfile(src, base.fullName);
  const hrProfile = normalizeHrProfile(src, base.fullName);
  const phoneNumber =
    pickOptionalString(src, "phoneNumber", "PhoneNumber") ||
    candidateProfile?.phoneNumber ||
    hrProfile?.phoneNumber ||
    undefined;

  return {
    ...base,
    phoneNumber: phoneNumber || undefined,
    avatarUrl: base.avatarUrl ?? candidateProfile?.avatarUrl ?? hrProfile?.avatarUrl ?? null,
    candidateProfile,
    hrProfile,
  };
}

function extractItemsArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];

  const root = raw as Record<string, unknown>;
  const nested = root.data;

  if (Array.isArray(nested)) return nested;
  if (nested && typeof nested === "object") {
    const obj = nested as Record<string, unknown>;
    for (const key of ["items", "Items", "users", "Users", "results", "Results"]) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
  }

  for (const key of ["items", "Items", "users", "Users", "results", "Results"]) {
    if (Array.isArray(root[key])) return root[key] as unknown[];
  }

  return [];
}

function extractTotalCount(raw: unknown, fallback: number): number {
  if (!raw || typeof raw !== "object") return fallback;

  const root = raw as Record<string, unknown>;
  const nested = root.data;

  const sources = [
    root,
    nested && typeof nested === "object" ? (nested as Record<string, unknown>) : null,
  ].filter(Boolean) as Record<string, unknown>[];

  for (const src of sources) {
    for (const key of [
      "totalCount",
      "TotalCount",
      "total",
      "Total",
      "count",
      "Count",
      "totalRecords",
      "TotalRecords",
    ]) {
      const val = src[key];
      if (typeof val === "number" && val >= 0) return val;
    }
  }

  return fallback;
}

export async function listUsers(
  params: AdminUsersListParams
): Promise<PaginatedResult<AdminUserListItem>> {
  const query: Record<string, string | number | boolean> = {
    Page: params.page,
    PageSize: params.pageSize,
  };

  if (params.search?.trim()) query.Search = params.search.trim();
  if (params.role) query.Role = params.role;
  if (params.isActive !== undefined) query.IsActive = params.isActive;

  const res = await apiClient.get("/api/users", { params: query });
  const rawItems = extractItemsArray(res.data);
  const items = rawItems
    .map(normalizeListItem)
    .filter((item): item is AdminUserListItem => item !== null);

  const totalCount = extractTotalCount(res.data, items.length);

  return {
    items,
    totalCount,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function getUserById(id: string): Promise<AdminUserDetail> {
  const res = await apiClient.get(`/api/users/${id}`);
  const user = normalizeUserDetail(res.data);
  if (!user) {
    throw new Error("Invalid user detail response");
  }
  return user;
}

export async function updateUserStatus(id: string, isActive: boolean): Promise<void> {
  await apiClient.patch(`/api/users/${id}/status`, { isActive });
}
