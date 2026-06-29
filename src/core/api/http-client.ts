import axios from "axios";
import { getApiBaseUrl } from "@/core/config/env";
import { attachAuthInterceptor } from "@/core/interceptors/auth.interceptor";
import { attachErrorInterceptor } from "@/core/interceptors/error.interceptor";

/**
 * Shared HTTP client for the whole app. All feature services call through this
 * instance so auth, refresh and error handling stay centralized.
 */
export const httpClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60_000,
  headers: { "Content-Type": "application/json" },
});

// Registration order matters for response interceptors (last registered runs
// first): error logging is attached first so it runs AFTER auth refresh/retry.
attachErrorInterceptor(httpClient);
attachAuthInterceptor(httpClient);

/** @deprecated Use `httpClient`. Kept as an alias during the migration. */
export const apiClient = httpClient;

export default httpClient;
