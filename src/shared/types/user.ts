export interface CandidateProfileData {
  fullName: string;
  targetRole?: string;
  seniorityLevel?: string;
  techStack?: string[];
  phoneNumber?: string;
  avatarUrl?: string | null;
  linkedInUrl?: string;
  githubUrl?: string;
  bio?: string;
}

export interface HrProfileData {
  fullName: string;
  companyId?: string;
  companyName?: string;
  jobTitle?: string;
  phoneNumber?: string;
  avatarUrl?: string | null;
  linkedInUrl?: string;
  bio?: string;
}

export interface CurrentUser {
  id?: string;
  fullName: string;
  email: string;
  role?: string;
  avatarUrl?: string | null;
  candidateProfile?: CandidateProfileData;
  hrProfile?: HrProfileData;
}

export type { CachedUserProfile } from "@/core/storage/user-profile-cache";

export interface UpdateHrProfileRequest {
  fullName: string;
  companyId?: string;
  companyName?: string;
  jobTitle?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  linkedInUrl?: string;
  bio?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
