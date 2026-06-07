import { apiClient } from "@/lib/api-client";
import type {
  HrRegisterRequest,
  CandidateRegisterRequest,
  LoginRequest,
  LoginResponse,
  GoogleLoginRequest,
  ResetPasswordRequest,
} from "@/types/auth";

export async function registerHr(data: HrRegisterRequest): Promise<void> {
  await apiClient.post("/api/auth/register/hr", data);
}

export async function resendVerification(email: string): Promise<void> {
  await apiClient.post("/api/auth/resend-verification", { email });
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await apiClient.post<LoginResponse>("/api/auth/login", data);
  return res.data;
}

export async function loginWithGoogle(
  data: GoogleLoginRequest
): Promise<LoginResponse> {
  const res = await apiClient.post<LoginResponse>(
    "/api/auth/oauth/google",
    data
  );
  return res.data;
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post("/api/auth/forgot-password", { email });
}

export async function resetPassword(data: ResetPasswordRequest): Promise<void> {
  await apiClient.post("/api/auth/reset-password", data);
}

export async function verifyEmail(token: string): Promise<void> {
  await apiClient.get("/api/auth/verify-email", { params: { token } });
}

export async function registerCandidate(
  data: CandidateRegisterRequest
): Promise<void> {
  await apiClient.post("/api/auth/register/candidate", data);
}

export { updateCandidateProfile } from "@/lib/api/user";
