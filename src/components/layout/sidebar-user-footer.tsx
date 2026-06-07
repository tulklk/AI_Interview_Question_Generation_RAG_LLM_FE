"use client";

import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { AvatarCircle } from "@/components/shared/avatar-circle";
import { resolveAvatarUrl } from "@/lib/user-display";
import { useUser } from "@/context/user-context";
import { useLogout } from "@/hooks/use-logout";

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
    <div className="px-4 py-4 border-t border-[#e5e7eb]">
      <div className="flex items-center gap-3">
        <AvatarCircle avatarUrl={avatarUrl} fullName={displayName} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-gray-800 text-sm font-semibold leading-tight truncate">
            {displayName}
          </p>
          {displayEmail ? (
            <p className="text-gray-400 text-[11px] leading-tight truncate">
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
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
