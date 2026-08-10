import { describe, test, expect } from "vitest";
import { extractErrorMessage } from "@/core/interceptors/error.interceptor";

// Grounded in src/core/interceptors/error.interceptor.ts. Maps to Excel
// sheet RGA011 (part of HRRAGAuthErrorHandling). Unit-test rewrite of
// auth-error-handling.spec.ts's RGA011-1: extractErrorMessage() only maps
// errorCode -> canned text, or falls back to response.data.detail/title/
// message/error — a genuinely empty error body falls all the way through to
// axiosErr.message, which is axios's own generic "Request failed with
// status code 500" string. No code path substitutes a friendly
// "Something went wrong" message for this case. Tested directly against the
// pure function rather than by clicking through Studio's generate flow.

describe("RGA011 — extractErrorMessage", () => {
  test("RGA011-1 (finding): a bare 5xx with no error body surfaces axios's raw technical message", () => {
    const axiosLikeError = {
      response: { status: 500, data: {} },
      message: "Request failed with status code 500",
    };
    expect(extractErrorMessage(axiosLikeError)).toBe("Request failed with status code 500");
  });

  test("a response body with a message field is preferred over the raw axios message", () => {
    const axiosLikeError = {
      response: { status: 400, data: { message: "Job description is required." } },
      message: "Request failed with status code 400",
    };
    expect(extractErrorMessage(axiosLikeError)).toBe("Job description is required.");
  });

  test("a known subscription errorCode maps to its canned message", () => {
    const axiosLikeError = {
      response: { status: 403, data: { errorCode: "QUOTA_EXCEEDED" } },
      message: "Request failed with status code 403",
    };
    expect(extractErrorMessage(axiosLikeError)).toBe(
      "You've used up your quota for this period. Upgrade to Premium or buy an extra Ask-AI pack."
    );
  });

  test("a completely bodyless/non-axios error falls back to the generic message", () => {
    expect(extractErrorMessage(undefined)).toBe("Something went wrong. Please try again.");
  });
});
