"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";
import { TopHeader } from "@/components/layout/top-header";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/context/toast-context";
import { useUser } from "@/context/user-context";
import { buildWelcomeMessage, getTimeOfDayGreeting } from "@/lib/greeting";
import {
  clearLoginWelcomePending,
  hasLoginWelcomePending,
} from "@/lib/login-welcome";
import { getInitials } from "@/lib/user-display";

interface AdminAppShellProps {
  children: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  pageTitle: string;
}

export function AdminAppShell({ children, breadcrumb, pageTitle }: AdminAppShellProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { addToast } = useToast();
  const { user, loading } = useUser();
  const welcomedRef = useRef(false);

  useEffect(() => {
    if (loading || welcomedRef.current || !hasLoginWelcomePending("admin")) return;

    const d = t.adminPages.dashboard;
    const displayName = user?.fullName?.trim() || d.defaultUserName;
    if (!displayName) return;

    welcomedRef.current = true;
    clearLoginWelcomePending();

    const greeting = getTimeOfDayGreeting({
      morning: d.greetingMorning,
      afternoon: d.greetingAfternoon,
      evening: d.greetingEvening,
      night: d.greetingNight,
    });
    const message = buildWelcomeMessage(d.welcomeTemplate, greeting, displayName);
    addToast("success", message);
  }, [addToast, loading, t.adminPages.dashboard, user?.fullName]);

  const routes = t.appShell.routes;
  const translatedTitle =
    routes[pathname as keyof typeof routes] ?? pageTitle;

  const translatedBreadcrumb = breadcrumb?.map((crumb) => ({
    ...crumb,
    label:
      t.appShell.breadcrumb[crumb.label.toLowerCase() as keyof typeof t.appShell.breadcrumb] ??
      crumb.label,
  }));

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopHeader
          variant="admin"
          breadcrumb={translatedBreadcrumb}
          pageTitle={translatedTitle}
          user={{
            initials: user?.fullName ? getInitials(user.fullName) : loading ? "..." : "AD",
            name: user?.fullName ?? (loading ? "..." : t.adminPages.dashboard.defaultUserName),
            plan: "Admin",
          }}
        />
        <main className="flex-1 overflow-y-auto bg-[#f5f7fb]">
          <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
