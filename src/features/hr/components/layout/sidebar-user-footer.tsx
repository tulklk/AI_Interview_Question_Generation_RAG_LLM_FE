"use client";

import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { AvatarCircle } from "@/shared/components/common/avatar-circle";
import { resolveAvatarUrl } from "@/shared/utils/user-display";
import { useUser } from "@/features/auth/context/user-context";
import { useLogout } from "@/features/auth/hooks/use-logout";

interface SidebarUserFooterProps {
  logoutTitle: string;
  badge?: ReactNode;
}

export function SidebarUserFooter({
  logoutTitle,
  badge,
}: SidebarUserFooterProps) {
  const { user, loading } = useUser();
  const { logout, loggingOut } = useLogout();

  const displayName = user?.fullName || (loading ? "..." : "User");
  const displayEmail = user?.email || (loading ? "..." : "");
  const avatarUrl = resolveAvatarUrl(user);

  return (
    <div className="px-4 py-4 border-t border-[rgba(124,58,237,0.08)] dark:border-[rgba(124,58,237,0.13)]">
      <div className="flex items-center gap-3">
        <div className="hr-avatar-ring rounded-full shrink-0">
          <AvatarCircle avatarUrl={avatarUrl} fullName={displayName} size="sm" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-800 dark:text-gray-100 text-sm font-semibold leading-tight truncate">
            {displayName}
          </p>
          {displayEmail ? (
            <p className="text-gray-400 dark:text-gray-500 text-[11px] leading-tight truncate">
              {displayEmail}
            </p>
          ) : null}
        </div>
        {badge}
        <button
          type="button"
          onClick={() => void logout()}
          disabled={loggingOut}
          title={logoutTitle}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-[#7C3AED] dark:hover:text-[#a78bff] hover:bg-[rgba(124,58,237,0.06)] dark:hover:bg-[rgba(124,58,237,0.1)] transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loggingOut ? (
            <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
          ) : (
            <LogOut size={14} />
          )}
        </button>
      </div>
    </div>
  );
}
