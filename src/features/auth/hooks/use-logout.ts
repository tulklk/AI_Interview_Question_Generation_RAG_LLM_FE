"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/features/auth/services/logout.service";
import { getRefreshToken } from "@/core/auth/token.service";
import { clearAuth } from "@/core/auth/permissions";
import { useUser } from "@/features/auth/context/user-context";

export function useLogout() {
  const router = useRouter();
  const { clearUser } = useUser();
  const [loggingOut, setLoggingOut] = useState(false);

  const logoutFn = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    const refreshToken = getRefreshToken();
    // Optimistic: clear local session + navigate immediately (do not wait on API timeout)
    clearAuth();
    clearUser();
    router.push("/login");
    if (refreshToken) {
      void logout(refreshToken).catch(() => undefined);
    }
    setLoggingOut(false);
  }, [clearUser, loggingOut, router]);

  return { logout: logoutFn, loggingOut };
}
