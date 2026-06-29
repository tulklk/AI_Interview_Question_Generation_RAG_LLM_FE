import { localStorageService } from "@/core/storage/local-storage.service";

const ACCESS = "interviewai_access_token";
const REFRESH = "interviewai_refresh_token";

export function getAccessToken(): string | null {
  return localStorageService.get(ACCESS);
}

export function getRefreshToken(): string | null {
  return localStorageService.get(REFRESH);
}

export function setAccessToken(token: string) {
  localStorageService.set(ACCESS, token);
}

export function setRefreshToken(token: string) {
  localStorageService.set(REFRESH, token);
}

/** Persist both tokens after login or refresh. */
export function setAuthTokens(accessToken: string, refreshToken?: string | null) {
  localStorageService.set(ACCESS, accessToken);
  if (refreshToken) localStorageService.set(REFRESH, refreshToken);
}

export function clearTokenStorage() {
  localStorageService.remove(ACCESS);
  localStorageService.remove(REFRESH);
}
