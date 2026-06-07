"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SearchInput } from "@/components/shared/search-input";
import { NotificationBell } from "@/components/shared/notification-bell";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
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
        "shrink-0 flex items-center gap-4 border-b border-[#e5e7eb] bg-[#f5f7fb]",
        isAdmin ? "h-16 min-h-[64px] px-6 md:px-10" : "h-14 px-8"
      )}
    >
      <div className="flex-1 min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav
            className={cn(
              "flex items-center gap-1",
              !isAdmin && "mb-0.5",
              isAdmin ? "text-sm font-medium text-[#6b7280]" : "text-xs text-gray-400"
            )}
          >
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={isAdmin ? 14 : 12} className="text-[#9ca3af]" />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className={cn(
                      "transition-colors no-underline",
                      isAdmin
                        ? "text-[#111827] hover:text-[#6c47ff]"
                        : "hover:text-gray-600 text-gray-400"
                    )}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isAdmin ? "text-[#6b7280]" : "text-gray-500"}>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {!isAdmin && (
          <h1 className="text-sm font-semibold text-gray-800 leading-tight">{pageTitle}</h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        <SearchInput placeholder={t.topHeader.searchPlaceholder} />
        <LanguageSwitcher />
        <div className="w-px h-5 bg-gray-200" />
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
