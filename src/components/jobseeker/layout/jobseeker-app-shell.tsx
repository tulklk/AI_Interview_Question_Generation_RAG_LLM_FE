"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { JobseekerSidebar } from "./jobseeker-sidebar";
import { TopHeader } from "@/components/layout/top-header";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/context/toast-context";
import { useUser } from "@/context/user-context";
import { buildWelcomeMessage, getTimeOfDayGreeting } from "@/lib/greeting";
import {
  clearLoginWelcomePending,
  hasLoginWelcomePending,
} from "@/lib/login-welcome";
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
  const { addToast } = useToast();
  const { user, loading } = useUser();
  const welcomedRef = useRef(false);

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
        <main className="flex-1 overflow-y-auto bg-[#f5f7fb] dark:bg-[#0b0f1a]">
          <div className="max-w-[1400px] mx-auto px-8 py-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
