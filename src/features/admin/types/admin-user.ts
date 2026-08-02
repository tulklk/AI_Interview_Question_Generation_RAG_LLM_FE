import type { CandidateProfileData, HrProfileData } from "@/shared/types/user";

export type AdminUserRoleKey = "ADMIN" | "HR_MANAGER" | "JOB_SEEKER" | "UNKNOWN";
export type AdminUserStatusKey = "Active" | "Pending" | "Suspended";

export interface AdminUserListItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  roleKey: AdminUserRoleKey;
  isActive: boolean;
  emailVerified?: boolean;
  createdAt?: string;
  avatarUrl?: string | null;
  /** Mã gói từ BE (HR_FREE / …). */
  planCode?: string | null;
  /** Premium còn hạn theo BE. */
  isPremium?: boolean;
}

export interface AdminUserDetail extends AdminUserListItem {
  phoneNumber?: string;
  candidateProfile?: CandidateProfileData;
  hrProfile?: HrProfileData;
}

export interface AdminUsersListParams {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
  isActive?: boolean;
  isPremium?: boolean;
  /** ISO date string, e.g. "2026-01-01" */
  createdFrom?: string;
  /** ISO date string, e.g. "2026-12-31" */
  createdTo?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}
