import type { AxiosError } from "axios";

/** Mã/stage BE khi JD bị từ chối (keyword / classify) — hiện inline, không toast popup. */
const JD_REJECT_CODES = new Set([
  "JD_NOT_JOB_POSTING",
  "JD_NOT_IT_ROLE",
  "JD_CLASSIFY_FAILED",
]);

const JD_REJECT_STAGES = new Set(["JD_CLASSIFY", "JD_VALIDATION", "JdValidation"]);

/**
 * SCRUM-432: phân biệt lỗi nhập JD (inline warning) vs lỗi hệ thống (toast).
 */
export function isJdInputRejectError(error: unknown): boolean {
  const axiosErr = error as AxiosError<Record<string, unknown>> | undefined;
  const status = axiosErr?.response?.status;
  const data = axiosErr?.response?.data;
  if (!data || typeof data !== "object") return false;

  const code =
    (typeof data.errorCode === "string" && data.errorCode) ||
    (data.extensions &&
    typeof data.extensions === "object" &&
    typeof (data.extensions as Record<string, unknown>).errorCode === "string"
      ? ((data.extensions as Record<string, unknown>).errorCode as string)
      : null);

  if (code && JD_REJECT_CODES.has(code)) return true;

  const stage = typeof data.stage === "string" ? data.stage : null;
  if (stage && JD_REJECT_STAGES.has(stage)) return true;

  // StructuredHttpException / ProblemDetails 422 từ validator JD
  if (status === 422 || status === 400) {
    const detail = typeof data.detail === "string" ? data.detail : "";
    const title = typeof data.title === "string" ? data.title : "";
    const blob = `${detail} ${title}`.toLowerCase();
    if (
      blob.includes("job description") ||
      blob.includes("tin tuyển") ||
      blob.includes("không hợp lệ") ||
      blob.includes("phần mềm") ||
      blob.includes("jd ")
    ) {
      return true;
    }
  }

  return false;
}
