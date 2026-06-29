export interface HrRegisterRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyId?: string;
  companyName: string;
  jobTitle: string;
}

export interface ApiErrorResponse {
  message?: string;
  error?: string;
  errors?: Record<string, string> | string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken?: string;
  access_token?: string;
  token?: string;
  refreshToken?: string;
  refresh_token?: string;
  role?: string;
  data?: {
    accessToken?: string;
    access_token?: string;
    token?: string;
    refreshToken?: string;
    refresh_token?: string;
    role?: string;
  };
}

export interface GoogleVerifyRequest {
  idToken: string;
  intendedRole?: string;
}

export interface GoogleVerifyResponse {
  isNewUser: boolean;
  linkedToLocalAccount: boolean;
}

export interface GoogleLoginRequest {
  idToken: string;
  intendedRole?: string;
  companyId?: string;
  companyName?: string;
  jobTitle?: string;
  targetRole?: string;
  seniorityLevel?: string;
  techStack?: string[];
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface CandidateRegisterRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  targetRole: string;
  seniorityLevel: string;
  techStack: string[];
}

export interface UpdateCandidateProfileRequest {
  fullName: string;
  targetRole?: string;
  seniorityLevel?: string;
  techStack?: string[];
  phoneNumber?: string;
  avatarUrl?: string;
  linkedInUrl?: string;
  githubUrl?: string;
  bio?: string;
}
