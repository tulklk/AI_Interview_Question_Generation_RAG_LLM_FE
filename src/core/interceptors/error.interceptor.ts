import type { AxiosError, AxiosInstance } from "axios";
import { logger } from "@/core/logger/logger";

/** Map errorCode từ SubscriptionGate (problem+json) sang thông báo người dùng. */
const SUBSCRIPTION_ERROR_MESSAGES: Record<string, Record<"en" | "vi", string>> = {
  QUOTA_EXCEEDED: {
    en: "You've used up your quota for this period. Upgrade to Premium or buy an extra Ask-AI pack.",
    vi: "Bạn đã hết hạn mức trong kỳ hiện tại. Nâng Premium hoặc mua thêm pack Ask-AI.",
  },
  COOLDOWN_ACTIVE: {
    en: "Free plan allows 1 completed question set or JD review per 24 hours. Please wait or upgrade to Premium.",
    vi: "Gói Free chỉ hoàn thành tạo bộ / đánh giá JD 1 lần / 24 giờ. Vui lòng đợi hoặc nâng Premium.",
  },
  FEATURE_REQUIRES_PREMIUM: {
    en: "This feature requires the Premium plan.",
    vi: "Tính năng này yêu cầu gói Premium.",
  },
  PLAN_REGENERATE_LIMIT: {
    en: "You've used all plan regenerations for this draft (max 5).",
    vi: "Đã hết lượt regenerate plan cho bản nháp này (tối đa 5 lần).",
  },
  QUESTION_REGEN_LIMIT: {
    en: "Free plan allows regenerating questions up to 2 times per set. Upgrade to Premium for unlimited regen.",
    vi: "Gói Free chỉ regen câu hỏi tối đa 2 lần trên mỗi bộ. Nâng Premium để regen không giới hạn.",
  },
};

/** 5xx / proxy failures — never surface raw Cloudflare "error code: 1033". */
const SERVER_ERROR_MESSAGES: Record<"en" | "vi", string> = {
  en: "The server is temporarily unavailable, so the job description could not be analyzed. Please try again later.",
  vi: "Máy chủ tạm thời không phản hồi nên chưa phân tích được JD. Vui lòng thử lại sau.",
};

const NETWORK_ERROR_MESSAGES: Record<"en" | "vi", string> = {
  en: "Could not reach the server, so the job description could not be analyzed. Check your connection and try again.",
  vi: "Không kết nối được máy chủ nên chưa phân tích được JD. Kiểm tra mạng rồi thử lại.",
};

const FALLBACK_MESSAGES: Record<"en" | "vi", string> = {
  en: "Something went wrong. Please try again.",
  vi: "Đã xảy ra lỗi. Vui lòng thử lại.",
};

/**
 * The BE answers in Vietnamese whatever language the UI is in — its global
 * handlers (InvalidModelStateResponseFactory, UseStatusCodePages) and ~240
 * service-level throws all carry hardcoded Vietnamese. Relaying that verbatim put
 * Vietnamese toasts on an English UI. These stand in by status code when the raw
 * message is Vietnamese and the UI is not.
 */
const STATUS_MESSAGES: Record<number, Record<"en" | "vi", string>> = {
  400: { en: "That request wasn't valid. Please check the form and try again.", vi: "Dữ liệu không hợp lệ." },
  401: { en: "Your session has expired. Please sign in again.", vi: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." },
  403: { en: "You don't have permission to do that.", vi: "Bạn không có quyền thực hiện thao tác này." },
  404: { en: "We couldn't find what you asked for.", vi: "Không tìm thấy tài nguyên yêu cầu." },
  405: { en: "That action isn't supported here.", vi: "Phương thức không được hỗ trợ." },
  409: { en: "That conflicts with the current state. Refresh and try again.", vi: "Thao tác xung đột với trạng thái hiện tại. Tải lại rồi thử lại." },
  413: { en: "That file is too large.", vi: "Tệp quá lớn." },
  429: { en: "Too many requests. Please wait a moment and try again.", vi: "Quá nhiều yêu cầu. Vui lòng đợi một lát rồi thử lại." },
};

const VIETNAMESE_RE =
  /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

/** True when the text is Vietnamese but the reader asked for English. */
function isWrongLanguage(text: string, lang: "en" | "vi"): boolean {
  return lang === "en" && VIETNAMESE_RE.test(text);
}

/** Cloudflare / gateway pages often expose only "error code: 1033". */
const CRYPTIC_ERROR_CODE_RE = /error\s*code\s*:\s*\d+/i;

/**
 * SCRUM-473: khi gọi API với responseType: "arraybuffer", body lỗi 403 cũng là
 * ArrayBuffer — decode UTF-8 + JSON trước khi đọc errorCode / detail.
 */
function normalizeErrorData(data: unknown): unknown {
  if (data == null) return data;
  if (typeof data === "string") {
    const trimmed = data.trim();
    if ((trimmed.startsWith("{") || trimmed.startsWith("[")) && trimmed.length > 1) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return data;
      }
    }
    return data;
  }
  if (typeof ArrayBuffer !== "undefined" && data instanceof ArrayBuffer) {
    try {
      const text = new TextDecoder("utf-8").decode(data);
      const trimmed = text.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        return JSON.parse(trimmed);
      }
      return trimmed;
    } catch {
      return null;
    }
  }
  // Axios đôi khi trả Uint8Array / Buffer-like
  if (
    typeof Uint8Array !== "undefined" &&
    data instanceof Uint8Array
  ) {
    try {
      const text = new TextDecoder("utf-8").decode(data);
      const trimmed = text.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        return JSON.parse(trimmed);
      }
      return trimmed;
    } catch {
      return null;
    }
  }
  return data;
}

function pickErrorCode(data: unknown): string | null {
  const normalized = normalizeErrorData(data);
  if (!normalized || typeof normalized !== "object") return null;
  const o = normalized as Record<string, unknown>;
  if (typeof o.errorCode === "string") return o.errorCode;
  const ext = o.extensions;
  if (ext && typeof ext === "object") {
    const e = ext as Record<string, unknown>;
    if (typeof e.errorCode === "string") return e.errorCode;
  }
  return null;
}

function isServerStatus(status: number | undefined): boolean {
  return status === 500 || status === 502 || status === 503 || status === 504;
}

function isCrypticProxyMessage(text: string): boolean {
  return CRYPTIC_ERROR_CODE_RE.test(text.trim());
}

function pickRawMessage(data: unknown): string | null {
  const normalized = normalizeErrorData(data);
  if (!normalized || typeof normalized !== "object") {
    if (typeof normalized === "string" && normalized.trim()) return normalized.trim();
    return null;
  }
  const d = normalized as Record<string, unknown>;
  for (const key of ["detail", "title", "message", "error"] as const) {
    const v = d[key];
    if (typeof v === "string" && v.trim()) return v.trim();
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
  const status = axiosErr?.response?.status;
  const data = normalizeErrorData(axiosErr?.response?.data);
  const code = pickErrorCode(data);

  // Check the known-errorCode localized message BEFORE the generic detail/error
  // fields — ASP.NET ProblemDetails (problem+json) responses from SubscriptionGate
  // populate `detail` alongside `errorCode`, so checking detail first meant these
  // localized messages were never shown.
  if (code && SUBSCRIPTION_ERROR_MESSAGES[code]) {
    return SUBSCRIPTION_ERROR_MESSAGES[code][lang];
  }

  // No HTTP response → network / timeout / CORS
  if (axiosErr?.isAxiosError && !axiosErr.response) {
    return NETWORK_ERROR_MESSAGES[lang];
  }

  if (isServerStatus(status)) {
    return SERVER_ERROR_MESSAGES[lang];
  }

  const raw = pickRawMessage(data) ?? (axiosErr?.message?.trim() || null);
  if (raw && isCrypticProxyMessage(raw)) {
    return SERVER_ERROR_MESSAGES[lang];
  }
  // Vietnamese UI: the BE text is already correct, so keep its specificity.
  // English UI: swap it for our own wording — the detail is unreadable anyway.
  //
  // Only swap when a specific replacement exists for this status (byStatus).
  // Without that guard, any status missing from STATUS_MESSAGES fell all the way
  // to the fully-generic FALLBACK_MESSAGES — discarding a business-specific reason
  // (e.g. 422 "this JD isn't in the IT/software domain, add tech details like
  // .NET/React/SQL") for a bare "Something went wrong", which is strictly less
  // useful than the Vietnamese original even to an English-reading user.
  const byStatus = status !== undefined ? STATUS_MESSAGES[status]?.[lang] : undefined;

  if (raw && isWrongLanguage(raw, lang) && byStatus) {
    return byStatus;
  }
  if (raw) return raw;

  return byStatus ?? FALLBACK_MESSAGES[lang];
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
