"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { JobseekerSidebar } from "./jobseeker-sidebar";
import { TopHeader } from "@/features/hr/components/layout/top-header";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { useUser } from "@/features/auth/context/user-context";
import { buildWelcomeMessage, getTimeOfDayGreeting } from "@/shared/utils/greeting";
import {
  clearLoginWelcomePending,
  hasLoginWelcomePending,
} from "@/features/auth/utils/login-welcome";
import { getInitials, resolveAvatarUrl } from "@/shared/utils/user-display";

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
  const { addToast } = useToast();
  const { user, loading } = useUser();
  const welcomedRef = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Body scroll lock when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    if (loading || welcomedRef.current || !hasLoginWelcomePending("jobseeker")) return;

    const displayName = user?.fullName?.trim();
    if (!displayName) return;

    welcomedRef.current = true;
    clearLoginWelcomePending();

    const p = t.jobseekerDashboardPage;
    const greeting = getTimeOfDayGreeting({
      morning: p.greetingMorning,
      afternoon: p.greetingAfternoon,
      evening: p.greetingEvening,
      night: p.greetingNight,
    });
    const message = buildWelcomeMessage(p.welcomeTemplate, greeting, displayName);
    addToast("success", message);
  }, [addToast, loading, t.jobseekerDashboardPage, user?.fullName]);

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
      <JobseekerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopHeader
          breadcrumb={translatedBreadcrumb}
          pageTitle={translatedTitle}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
          user={{
            initials: user?.fullName ? getInitials(user.fullName) : loading ? "..." : "??",
            name: user?.fullName ?? (loading ? "..." : "User"),
            plan: "Free",
            avatarUrl: resolveAvatarUrl(user),
          }}
        />
        <main className="flex-1 overflow-y-auto hr-main-bg">
          {/* Aurora orbs — visible in dark mode only */}
          <div className="hr-aurora-orb hr-aurora-orb--purple w-130 h-130 -top-20 -left-15" aria-hidden="true" />
          <div className="hr-aurora-orb hr-aurora-orb--cyan w-100 h-100 bottom-[10%] -right-10" aria-hidden="true" />
          <div className="hr-aurora-orb hr-aurora-orb--violet w-80 h-80 top-[40%] left-[30%]" aria-hidden="true" />
          <div className="relative z-10 max-w-350 mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
