import { clearTokenStorage, getAccessToken } from "@/lib/auth-tokens";

export { getAccessToken, getRefreshToken, setAuthTokens } from "@/lib/auth-tokens";

const KEY = "interviewai_auth";

export const setAuth = () => {
  if (typeof window !== "undefined") localStorage.setItem(KEY, "true");
};

export const clearAuth = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  clearTokenStorage();
};

/** True if legacy mock flag is set or a JWT access token exists. */
export const isAuthenticated = () => {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(KEY) === "true") return true;
  return Boolean(getAccessToken());
};
