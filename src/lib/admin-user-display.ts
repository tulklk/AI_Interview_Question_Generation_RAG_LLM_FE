import type { AdminUserListItem, AdminUserRoleKey, AdminUserStatusKey } from "@/types/admin-user";

/** Matches DomainLayer.Constants.UserRole (list/filter query param). */
export const BACKEND_LIST_USER_ROLE = {
  ADMIN: "Admin",
  HR: "HR",
  CANDIDATE: "Candidate",
} as const;

export function toBackendRoleFilter(roleKey: AdminUserRoleKey): string | undefined {
  switch (roleKey) {
    case "ADMIN":
      return BACKEND_LIST_USER_ROLE.ADMIN;
    case "HR_MANAGER":
      return BACKEND_LIST_USER_ROLE.HR;
    case "JOB_SEEKER":
      return BACKEND_LIST_USER_ROLE.CANDIDATE;
    default:
      return undefined;
  }
}

export function normalizeAdminRoleKey(role: string | undefined): AdminUserRoleKey {
  const r = (role ?? "").toUpperCase();
  if (r.includes("ADMIN")) return "ADMIN";
  if (r.includes("HR") || r.includes("RECRUIT")) return "HR_MANAGER";
  if (r.includes("JOB") || r.includes("CANDIDATE") || r.includes("SEEKER")) return "JOB_SEEKER";
  return "UNKNOWN";
}

export function getAdminUserStatus(user: Pick<AdminUserListItem, "isActive" | "emailVerified">): AdminUserStatusKey {
  if (!user.isActive) return "Suspended";
  if (user.emailVerified === false) return "Pending";
  return "Active";
}

export function isAdminRole(role: string | undefined | null): boolean {
  return (role ?? "").toUpperCase().includes("ADMIN");
}
