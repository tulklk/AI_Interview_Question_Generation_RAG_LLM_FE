import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SearchInput } from "@/components/shared/search-input";
import { NotificationBell } from "@/components/shared/notification-bell";
import { UserAvatar } from "@/components/shared/user-avatar";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopHeaderUser {
  initials: string;
  name: string;
  plan?: string;
}

interface TopHeaderProps {
  breadcrumb?: BreadcrumbItem[];
  pageTitle: string;
  user?: TopHeaderUser;
}

const DEFAULT_USER: TopHeaderUser = {
  initials: "HR",
  name: "HR Manager",
  plan: "Pro Plan",
};

export function TopHeader({ breadcrumb, pageTitle, user = DEFAULT_USER }: TopHeaderProps) {
  return (
    <header className="h-14 shrink-0 bg-[#f5f7fb] flex items-center px-8 gap-4 border-b border-gray-100">
      <div className="flex-1 min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-gray-600 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-500">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-sm font-semibold text-gray-800 leading-tight">
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <SearchInput />
        <NotificationBell count={2} />
        <UserAvatar initials={user.initials} name={user.name} plan={user.plan} />
      </div>
    </header>
  );
}
