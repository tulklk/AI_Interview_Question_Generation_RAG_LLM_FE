import type { AdminUserListItem, AdminUserRoleKey, AdminUserStatusKey } from "@/types/admin-user";

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
