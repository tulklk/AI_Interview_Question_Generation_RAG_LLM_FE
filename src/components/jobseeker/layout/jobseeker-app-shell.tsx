"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { JobseekerSidebar } from "./jobseeker-sidebar";
import { TopHeader } from "@/components/layout/top-header";
import { useLanguage } from "@/context/language-context";
import { useUser } from "@/context/user-context";
import { getInitials, resolveAvatarUrl } from "@/lib/user-display";

interface JobseekerAppShellProps {
  children: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  pageTitle: string;
}

export function JobseekerAppShell({
  children,
  breadcrumb,
  pageTitle,
}: JobseekerAppShellProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { user, loading } = useUser();

  const routes = t.jobseekerAppShell.routes;
  const translatedTitle =
    routes[pathname as keyof typeof routes] ?? pageTitle;

  const crumbMap = t.jobseekerAppShell.breadcrumb;
  const translatedBreadcrumb = breadcrumb?.map((crumb) => ({
    ...crumb,
    label:
      crumbMap[crumb.label.toLowerCase() as keyof typeof crumbMap] ??
      crumb.label,
  }));

  return (
    <div className="flex h-screen overflow-hidden">
      <JobseekerSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopHeader
          breadcrumb={translatedBreadcrumb}
          pageTitle={translatedTitle}
          user={{
            initials: user?.fullName ? getInitials(user.fullName) : loading ? "..." : "??",
            name: user?.fullName ?? (loading ? "..." : "User"),
            plan: "Free",
            avatarUrl: resolveAvatarUrl(user),
          }}
        />
        <main className="flex-1 overflow-y-auto bg-[#f5f7fb]">
          <div className="max-w-[1400px] mx-auto px-8 py-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
