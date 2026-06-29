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
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}
