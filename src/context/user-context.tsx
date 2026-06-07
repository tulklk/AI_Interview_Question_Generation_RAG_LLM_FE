"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/api/user";
import { isAuthenticated } from "@/lib/auth";
import {
  getCachedUserProfile,
  setCachedUserProfile,
  clearCachedUserProfile,
} from "@/lib/user-profile-cache";
import type { CurrentUser } from "@/types/user";

interface UserContextValue {
  user: CurrentUser | null;
  loading: boolean;
  refreshUser: () => Promise<CurrentUser | null>;
  clearUser: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

function cacheFromUser(user: CurrentUser): void {
  setCachedUserProfile({
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl ?? user.candidateProfile?.avatarUrl ?? user.hrProfile?.avatarUrl ?? null,
  });
}

function userFromCache(): CurrentUser | null {
  const cached = getCachedUserProfile();
  if (!cached) return null;
  return {
    fullName: cached.fullName,
    email: cached.email,
    avatarUrl: cached.avatarUrl ?? undefined,
  };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const clearUser = useCallback(() => {
    clearCachedUserProfile();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async (): Promise<CurrentUser | null> => {
    if (!isAuthenticated()) {
      clearUser();
      return null;
    }

    try {
      const profile = await getCurrentUser();
      cacheFromUser(profile);
      setUser(profile);
      return profile;
    } catch {
      const cached = userFromCache();
      if (cached) setUser(cached);
      return cached;
    }
  }, [clearUser]);

  useEffect(() => {
    if (!isAuthenticated()) {
      setUser(null);
      setLoading(false);
      return;
    }

    const cached = userFromCache();
    if (cached) setUser(cached);

    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}
