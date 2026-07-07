import { apiClient } from "@/core/api/http-client";
import type {
  HrRegisterRequest,
  CandidateRegisterRequest,
  LoginRequest,
  LoginResponse,
  GoogleVerifyRequest,
  GoogleVerifyResponse,
  GoogleLoginRequest,
  ResetPasswordRequest,
} from "@/features/auth/types/auth";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return null;
}

export function normalizeGoogleVerifyResponse(raw: unknown): GoogleVerifyResponse {
  const root = asRecord(raw) ?? {};
  const src = asRecord(root.data) ?? root;
  return {
    isNewUser: Boolean(src.isNewUser ?? src.IsNewUser),
    linkedToLocalAccount: Boolean(
      src.linkedToLocalAccount ?? src.LinkedToLocalAccount
    ),
  };
}

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

export async function verifyGoogleOAuth(
  data: GoogleVerifyRequest
): Promise<GoogleVerifyResponse> {
  const res = await apiClient.post(
    "/api/auth/oauth/google/verify",
    data
  );
  return normalizeGoogleVerifyResponse(res.data);
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

export async function verifyEmail(email: string, otp: string): Promise<void> {
  await apiClient.post("/api/auth/verify-email", { email, otp });
}

export async function registerCandidate(
  data: CandidateRegisterRequest
): Promise<void> {
  await apiClient.post("/api/auth/register/candidate", data);
}

export { updateCandidateProfile } from "@/features/auth/services/user.service";
