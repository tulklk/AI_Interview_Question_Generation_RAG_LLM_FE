import type { AxiosError, AxiosInstance } from "axios";
import { logger } from "@/core/logger/logger";

/** Normalize an axios error into a human-readable message. */
export function extractErrorMessage(error: unknown): string {
  const axiosErr = error as AxiosError<{ message?: string; error?: string }> | undefined;
  const data = axiosErr?.response?.data;
  if (data && typeof data === "object") {
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
