import type { AxiosError } from "axios";
import type { ApiErrorResponse } from "@/features/auth/types/auth";

const DISABLED_ACCOUNT_HINTS = [
  "disabled",
  "deactivated",
  "inactive",
  "locked",
  "bị vô hiệu hóa",
  "bi vo hieu hoa",
  "vô hiệu hóa",
  "vo hieu hoa",
  "bị khóa",
  "bi khoa",
  "tài khoản đã bị",
  "tai khoan da bi",
];

const UNVERIFIED_HINTS = [
  "verif",
  "unverified",
  "not verified",
  "email not confirmed",
  "email is not confirmed",
  "activate your account",
  "account not activated",
  "pending verification",
  "chưa xác minh",
  "chua xac minh",
  "xác minh email",
  "xac minh email",
];

function collectErrorText(err: AxiosError<ApiErrorResponse>): string {
  const data = err.response?.data;
  const parts: string[] = [];

  if (data?.message) parts.push(data.message);
  if (data?.errors) {
    parts.push(...Object.values(data.errors));
  }

  const extra = data as Record<string, unknown> | undefined;
  if (typeof extra?.code === "string") parts.push(extra.code);
  if (typeof extra?.error === "string") parts.push(extra.error);
  if (typeof extra?.title === "string") parts.push(extra.title);

  return parts.join(" ").toLowerCase();
}

export function isUnverifiedLoginError(err: unknown): boolean {
  const axiosErr = err as AxiosError<ApiErrorResponse>;
  if (!axiosErr.response) return false;

  const text = collectErrorText(axiosErr);
  return UNVERIFIED_HINTS.some((hint) => text.includes(hint));
}

export function isDisabledAccountLoginError(err: unknown): boolean {
  const axiosErr = err as AxiosError<ApiErrorResponse>;
  if (!axiosErr.response) return false;

  const text = collectErrorText(axiosErr);
  return DISABLED_ACCOUNT_HINTS.some((hint) => text.includes(hint));
}

export function getLoginApiErrorMessage(err: unknown): string | undefined {
  const axiosErr = err as AxiosError<ApiErrorResponse>;
  const data = axiosErr.response?.data as Record<string, unknown> | undefined;
  if (typeof data?.error === "string" && data.error.trim()) return data.error.trim();
  if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
  return undefined;
}
