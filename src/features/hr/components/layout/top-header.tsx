"use client";

import Link from "next/link";
import { ChevronRight, Menu } from "lucide-react";
import { SearchInput } from "@/shared/components/common/search-input";
import { NotificationBell } from "@/shared/components/common/notification-bell";
import { UserAvatar } from "@/shared/components/common/user-avatar";
import { LanguageSwitcher } from "@/shared/components/common/language-switcher";
import { ThemeToggle } from "@/shared/components/common/theme-toggle";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopHeaderUser {
  initials: string;
  name: string;
  plan?: string;
  avatarUrl?: string | null;
}

interface TopHeaderProps {
  breadcrumb?: BreadcrumbItem[];
  pageTitle: string;
  user?: TopHeaderUser;
  variant?: "default" | "admin";
  onMenuToggle?: () => void;
}

const DEFAULT_USER: TopHeaderUser = {
  initials: "HR",
  name: "HR Manager",
  plan: "Pro Plan",
};

export function TopHeader({
  breadcrumb,
  pageTitle,
  user = DEFAULT_USER,
  variant = "default",
  onMenuToggle,
}: TopHeaderProps) {
  const { t } = useLanguage();
  const isAdmin = variant === "admin";

  return (
    <header
      className={cn(
        "shrink-0 flex items-center gap-2 md:gap-4",
        !isAdmin && "hr-topbar",
        isAdmin && "bg-page-bg dark:bg-gray-950 border-b border-border dark:border-gray-800",
        isAdmin ? "h-16 min-h-16 px-4 md:px-6 lg:px-10" : "h-14 px-4 md:px-8"
      )}
    >
      {/* Hamburger — mobile only */}
      {onMenuToggle && (
        <button
          type="button"
          onClick={onMenuToggle}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
      )}

      <div className="flex-1 min-w-0">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav
            className={cn(
              "flex items-center gap-1",
              isAdmin
                ? "text-sm font-medium text-[#6b7280] dark:text-gray-400"
                : "text-xs text-gray-400 dark:text-gray-500"
            )}
          >
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1 min-w-0">
                {i > 0 && (
                  <ChevronRight
                    size={isAdmin ? 14 : 12}
                    className="text-[#9ca3af] dark:text-gray-600 shrink-0"
                  />
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className={cn(
                      "transition-colors no-underline truncate",
                      isAdmin
                        ? "text-charcoal dark:text-gray-200 hover:text-primary dark:hover:text-[#a78bff]"
                        : "hover:text-gray-600 dark:hover:text-gray-300 text-gray-400 dark:text-gray-500"
                    )}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={cn("truncate", isAdmin ? "text-[#6b7280] dark:text-gray-400" : "text-gray-500 dark:text-gray-400")}>
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        ) : (
          /* Show page title on mobile when no breadcrumb */
          <span className="lg:hidden text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
            {pageTitle}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
        {/* Search — hidden on small mobile */}
        <div className="hidden sm:block">
          <SearchInput placeholder={t.topHeader.searchPlaceholder} />
        </div>
        <ThemeToggle />
        {/* Language switcher — hidden on smallest screens */}
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>
        <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-gray-700" />
        <NotificationBell count={2} />
        <UserAvatar
          initials={user.initials}
          name={user.name}
          plan={user.plan}
          avatarUrl={user.avatarUrl}
        />
      </div>
    </header>
  );
}
