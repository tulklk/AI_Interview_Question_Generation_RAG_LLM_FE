"use client";

import { useCallback, useState } from "react";
import { logout } from "@/features/auth/services/logout.service";
import { getRefreshToken } from "@/core/auth/token.service";
import { clearAuth } from "@/core/auth/permissions";
import { getLoginPath } from "@/core/config/env";
import { useUser } from "@/features/auth/context/user-context";

export function useLogout() {
  const { clearUser } = useUser();
  const [loggingOut, setLoggingOut] = useState(false);

  const logoutFn = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    const refreshToken = getRefreshToken();
    // Optimistic: clear local session immediately; hard redirect clears in-memory UI state
    clearAuth();
    clearUser();
    if (refreshToken) {
      void logout(refreshToken).catch(() => undefined);
    }
    if (typeof window !== "undefined") {
      window.location.assign(getLoginPath());
    }
  }, [clearUser, loggingOut]);

  return { logout: logoutFn, loggingOut };
}
