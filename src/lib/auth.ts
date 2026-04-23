const KEY = "interviewai_auth";

export const setAuth = () => localStorage.setItem(KEY, "true");
export const clearAuth = () => localStorage.removeItem(KEY);
export const isAuthenticated = () =>
  typeof window !== "undefined" && localStorage.getItem(KEY) === "true";
