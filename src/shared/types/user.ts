export interface CandidateProfileData {
  fullName: string;
  targetRole?: string;
  seniorityLevel?: string;
    techStack?: string[];
    cvFileName?: string | null;
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
  githubUrl?: string;
  bio?: string;
  inviteMessageTemplate?: string | null;
}

export interface CurrentUser {
  id?: string;
  fullName: string;
  email: string;
  role?: string;
  avatarUrl?: string | null;
  provider?: string;
  /** True khi đăng ký Google hoặc đã liên kết Google với tài khoản local. */
  isGoogleLinked?: boolean;
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
  githubUrl?: string;
  bio?: string;
  inviteMessageTemplate?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
