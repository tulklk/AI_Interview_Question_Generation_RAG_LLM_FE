import type { AxiosError, AxiosInstance } from "axios";
import { logger } from "@/core/logger/logger";

/** Map errorCode từ SubscriptionGate (problem+json) sang thông báo người dùng. */
const SUBSCRIPTION_ERROR_MESSAGES: Record<string, Record<"en" | "vi", string>> = {
  QUOTA_EXCEEDED: {
    en: "You've used up your quota for this period. Upgrade to Premium or buy an extra Ask-AI pack.",
    vi: "Bạn đã hết hạn mức trong kỳ hiện tại. Nâng Premium hoặc mua thêm pack Ask-AI.",
  },
  COOLDOWN_ACTIVE: {
    en: "Free plan allows 4 question sets per 24 hours. Please wait or upgrade to Premium.",
    vi: "Gói Free chỉ tạo bộ câu hỏi 4 lần / 24 giờ. Vui lòng đợi hoặc nâng Premium.",
  },
  FEATURE_REQUIRES_PREMIUM: {
    en: "This feature requires the Premium plan.",
    vi: "Tính năng này yêu cầu gói Premium.",
  },
  PLAN_REGENERATE_LIMIT: {
    en: "You've used all plan regenerations for this draft (max 5).",
    vi: "Đã hết lượt regenerate plan cho bản nháp này (tối đa 5 lần).",
  },
};

function pickErrorCode(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (typeof o.errorCode === "string") return o.errorCode;
  const ext = o.extensions;
  if (ext && typeof ext === "object") {
    const e = ext as Record<string, unknown>;
    if (typeof e.errorCode === "string") return e.errorCode;
  }
  return null;
}

/** Normalize an axios error into a human-readable message. */
export function extractErrorMessage(error: unknown, lang: "en" | "vi" = "en"): string {
  const axiosErr = error as AxiosError<{
    message?: string;
    error?: string;
    title?: string;
    detail?: string;
    errorCode?: string;
    extensions?: { errorCode?: string };
  }> | undefined;
  const data = axiosErr?.response?.data;
  const code = pickErrorCode(data);
  if (data && typeof data === "object") {
    if (typeof data.detail === "string" && data.detail) return data.detail;
    if (typeof data.error === "string" && data.error) return data.error;
  }
  if (code && SUBSCRIPTION_ERROR_MESSAGES[code]) {
    return SUBSCRIPTION_ERROR_MESSAGES[code][lang];
  }
  if (data && typeof data === "object") {
    if (typeof data.detail === "string" && data.detail) return data.detail;
    if (typeof data.title === "string" && data.title) return data.title;
    if (typeof data.message === "string" && data.message) return data.message;
    if (typeof data.error === "string" && data.error) return data.error;
  }
  if (axiosErr?.message) return axiosErr.message;
  return "Something went wrong. Please try again.";
}

/**
 * Centralized error logging. Registered BEFORE the auth interceptor so that it
 * runs AFTER auth has had a chance to refresh/retry (axios response interceptors
 * run last-registered-first). Always re-rejects so callers still handle errors.
 */
export function attachErrorInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status;
      logger.debug(
        `[http] ${status ?? "ERR"} ${error.config?.method?.toUpperCase() ?? ""} ${error.config?.url ?? ""}`
      );
      return Promise.reject(error);
    }
  );
}
