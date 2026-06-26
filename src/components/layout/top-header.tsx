"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SearchInput } from "@/components/shared/search-input";
import { NotificationBell } from "@/components/shared/notification-bell";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";

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
}: TopHeaderProps) {
  const { t } = useLanguage();
  const isAdmin = variant === "admin";

  return (
    <header
      className={cn(
        "shrink-0 flex items-center gap-4",
        !isAdmin && "hr-topbar",
        isAdmin && "bg-page-bg dark:bg-gray-950 border-b border-border dark:border-gray-800",
        isAdmin ? "h-16 min-h-16 px-6 md:px-10" : "h-14 px-8"
      )}
    >
      <div className="flex-1 min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav
            className={cn(
              "flex items-center gap-1",
              isAdmin
                ? "text-sm font-medium text-[#6b7280] dark:text-gray-400"
                : "text-xs text-gray-400 dark:text-gray-500"
            )}
          >
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight
                    size={isAdmin ? 14 : 12}
                    className="text-[#9ca3af] dark:text-gray-600"
                  />
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className={cn(
                      "transition-colors no-underline",
                      isAdmin
                        ? "text-charcoal dark:text-gray-200 hover:text-primary dark:hover:text-[#a78bff]"
                        : "hover:text-gray-600 dark:hover:text-gray-300 text-gray-400 dark:text-gray-500"
                    )}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isAdmin ? "text-[#6b7280] dark:text-gray-400" : "text-gray-500 dark:text-gray-400"}>
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        <SearchInput placeholder={t.topHeader.searchPlaceholder} />
        <ThemeToggle />
        <LanguageSwitcher />
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
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
