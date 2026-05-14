import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { clearAuth } from "@/lib/auth";
import {
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from "@/lib/auth-tokens";
import { getApiBaseUrl, getAuthRefreshPath, getLoginPath } from "@/lib/env";

function extractTokensFromBody(data: unknown): {
  accessToken: string;
  refreshToken?: string;
} | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const nested =
    root.data !== undefined && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;
  const access =
    (nested.accessToken as string) ||
    (nested.access_token as string) ||
    (nested.token as string);
  if (!access || typeof access !== "string") return null;
  const refresh =
    (nested.refreshToken as string) ||
    (nested.refresh_token as string) ||
    undefined;
  return {
    accessToken: access,
    refreshToken: typeof refresh === "string" ? refresh : undefined,
  };
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const login = getLoginPath();
  if (window.location.pathname === login) return;
  window.location.assign(login);
}

/** Axios instance without auth interceptors — used only for refresh calls. */
function createRefreshClient(): AxiosInstance {
  return axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 30_000,
    headers: { "Content-Type": "application/json" },
  });
}

const refreshClient = createRefreshClient();

let refreshInFlight: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const path = getAuthRefreshPath();
  try {
    const { data } = await refreshClient.post(path, { refreshToken });
    const tokens = extractTokensFromBody(data);
    if (!tokens) return false;
    setAuthTokens(tokens.accessToken, tokens.refreshToken ?? refreshToken);
    return true;
  } catch {
    return false;
  }
}

function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function isRefreshRequest(config: InternalAxiosRequestConfig): boolean {
  const path = getAuthRefreshPath();
  const url = config.url ?? "";
  return url === path || url.endsWith(path);
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60_000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window === "undefined") return config;

  const token = getAccessToken();
  if (token) {
    if (!config.headers) config.headers = new AxiosHeaders();
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig | undefined;
    if (!original) return Promise.reject(error);

    const status = error.response?.status;
    if (status !== 401) return Promise.reject(error);

    if (isRefreshRequest(original)) {
      clearAuth();
      redirectToLogin();
      return Promise.reject(error);
    }

    if (original._retry) {
      clearAuth();
      redirectToLogin();
      return Promise.reject(error);
    }

    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      clearAuth();
      redirectToLogin();
      return Promise.reject(error);
    }

    original._retry = true;
    if (!original.headers) original.headers = new AxiosHeaders();
    const newAccess = getAccessToken();
    if (newAccess) original.headers.set("Authorization", `Bearer ${newAccess}`);

    return apiClient.request(original);
  }
);

export default apiClient;
