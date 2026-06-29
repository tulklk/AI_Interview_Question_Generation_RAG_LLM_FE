/**
 * Public env vars (inlined at build time). Use NEXT_PUBLIC_* for browser access.
 */

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return raw.replace(/\/+$/, "");
}

export function getAuthRefreshPath(): string {
  const path = process.env.NEXT_PUBLIC_AUTH_REFRESH_PATH ?? "/auth/refresh";
  return path.startsWith("/") ? path : `/${path}`;
}

export function getLoginPath(): string {
  const path = process.env.NEXT_PUBLIC_APP_LOGIN_PATH ?? "/login";
  return path.startsWith("/") ? path : `/${path}`;
}

export function getRagBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_RAG_BASE_URL ?? "https://iqgsrag.cloud";
  return raw.replace(/\/+$/, "");
}

export function getRagApiKey(): string {
  return process.env.RAG_API_KEY ?? process.env.NEXT_PUBLIC_RAG_API_KEY ?? "";
}

export function getGoogleClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
}
