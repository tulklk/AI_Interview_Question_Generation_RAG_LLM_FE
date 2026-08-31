"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { isAdminNavActive } from "@/shared/utils/nav";
import { adminNavItems } from "@/features/admin/data/admin";
import { useLanguage } from "@/shared/providers/language-context";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useUser } from "@/features/auth/context/user-context";
import { resolveAvatarUrl } from "@/shared/utils/user-display";
import { AvatarCircle } from "@/shared/components/common/avatar-circle";
import { BrandLogo } from "@/shared/components/common/brand-logo";

export function AdminSidebar({ navBadges }: { navBadges?: Partial<Record<string, number>> }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { logout, loggingOut } = useLogout();
  const { user, loading } = useUser();
  const s = t.adminSidebar;

  const displayName = user?.fullName || (loading ? "..." : "Administrator");
  const displayEmail = user?.email || (loading ? "..." : "");
  const avatarUrl = resolveAvatarUrl(user);
  /** Lấy 2 từ cuối của tên đầy đủ để hiển thị trong sidebar */
  const shortName = (() => {
    const words = displayName.trim().split(/\s+/);
    return words.length <= 2 ? displayName : words.slice(-2).join(" ");
  })();

  return (
    <aside className="hr-sidebar flex flex-col w-68 shrink-0 h-screen overflow-y-auto">
      <div className="px-5 pt-6 pb-2">
        <BrandLogo
          logoClassName="w-9 h-9"
          subtitleClassName="text-gray-400 dark:text-gray-500 text-[11px]"
        />
      </div>

      <nav className="flex-1 px-4 mt-6">
        <p className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">
          {s.sectionLabel}
        </p>

        <ul className="space-y-0.5">
          {adminNavItems.map((item) => {
            const isActive = isAdminNavActive(item.href, pathname);
            const label = s.nav[item.href as keyof typeof s.nav] ?? item.label;
            const badgeCount = navBadges?.[item.href] ?? item.badge;
            const isPendingFeedbackBadge =
              item.href === "/admin/feedbacks" && (navBadges?.[item.href] ?? 0) > 0;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                    isActive
                      ? "hr-nav-active text-[#7C3AED] dark:text-[#a78bff] font-semibold"
                      : "text-[#6b7280] dark:text-gray-400 hover:bg-[rgba(124,58,237,0.06)] dark:hover:bg-[rgba(124,58,237,0.08)] hover:text-charcoal dark:hover:text-gray-100"
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                      isActive
                        ? "hr-icon-box"
                        : "bg-gray-100 dark:bg-gray-800 group-hover:bg-[rgba(124,58,237,0.08)] dark:group-hover:bg-[rgba(124,58,237,0.12)]"
                    )}
                  >
                    <item.icon
                      size={15}
                      className={cn(
                        "transition-colors duration-200",
                        isActive
                          ? "text-[#7C3AED] dark:text-[#a78bff]"
                          : "text-[#9ca3af] dark:text-gray-500 group-hover:text-[#7C3AED] dark:group-hover:text-[#a78bff]"
                      )}
                    />
                  </div>

                  <span className="text-sm font-medium flex-1">{label}</span>

                  {badgeCount !== undefined && badgeCount > 0 && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none",
                        isPendingFeedbackBadge
                          ? isActive
                            ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                          : isActive
                            ? "bg-[rgba(124,58,237,0.12)] dark:bg-[rgba(124,58,237,0.2)] text-[#7C3AED] dark:text-[#a78bff]"
                            : "bg-page-bg dark:bg-gray-800 text-[#6b7280] dark:text-gray-400"
                      )}
                    >
                      {badgeCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Footer */}
      <div className="px-4 py-4 border-t border-black/5 dark:border-white/8">
        <div className="flex items-center gap-3">
          <div className="hr-avatar-ring rounded-full shrink-0">
            <AvatarCircle avatarUrl={avatarUrl} fullName={displayName} size="sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-800 dark:text-gray-100 text-sm font-semibold leading-tight truncate" title={displayName}>
              {shortName}
            </p>
            {displayEmail ? (
              <p className="text-gray-400 dark:text-gray-500 text-[11px] leading-tight truncate">
                {displayEmail}
              </p>
            ) : null}
          </div>
          <span className="text-[10px] font-bold text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded-full shrink-0">
            Admin
          </span>
          <button
            type="button"
            onClick={() => void logout()}
            disabled={loggingOut}
            title={s.logoutTitle}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-[#7C3AED] dark:hover:text-[#a78bff] hover:bg-[rgba(124,58,237,0.08)] dark:hover:bg-[rgba(124,58,237,0.12)] transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loggingOut ? (
              <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-[#7C3AED] rounded-full animate-spin" />
            ) : (
              <LogOut size={14} />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
