import { apiClient } from "@/lib/api-client";
import { getRefreshToken } from "@/lib/auth-tokens";
import { clearAuth } from "@/lib/auth";

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
