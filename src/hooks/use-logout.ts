"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { logoutSession } from "@/lib/logout";
import { useUser } from "@/context/user-context";

export function useLogout() {
  const router = useRouter();
  const { clearUser } = useUser();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutSession();
      clearUser();
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  }, [clearUser, loggingOut, router]);

  return { logout, loggingOut };
}
