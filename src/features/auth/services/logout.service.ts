import { apiClient } from "@/core/api/http-client";
import { getRefreshToken } from "@/core/auth/token.service";
import { clearAuth } from "@/core/auth/permissions";

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post("/api/auth/logout", { refreshToken });
}

/** Invalidate refresh token on server, then clear local session. */
export async function logoutSession(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await logout(refreshToken);
    }
  } catch {
    // Always clear local session even if API fails (expired token, network, etc.)
  } finally {
    clearAuth();
  }
}
