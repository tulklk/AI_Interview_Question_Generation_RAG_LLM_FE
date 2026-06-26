"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopHeader } from "./top-header";
import { GenerationProgressBadge } from "@/components/generate/generation-progress-badge";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/context/toast-context";
import { useHrSubscription } from "@/context/hr-subscription-context";
import { useUser } from "@/context/user-context";
import { buildWelcomeMessage, getTimeOfDayGreeting } from "@/lib/greeting";
import { clearLoginWelcomePending, hasLoginWelcomePending } from "@/lib/login-welcome";
import { getInitials, resolveAvatarUrl } from "@/lib/user-display";
import type { HrPlanId } from "@/types/hr-subscription";

interface AppShellProps {
  children: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  pageTitle: string;
}

export function AppShell({ children, breadcrumb, pageTitle }: AppShellProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { planId } = useHrSubscription();
  const { user, loading } = useUser();
  const { addToast } = useToast();
  const welcomedRef = useRef(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (loading || welcomedRef.current || !hasLoginWelcomePending("hr")) return;

    const displayName = user?.fullName?.trim();
    if (!displayName) return;

    welcomedRef.current = true;
    clearLoginWelcomePending();

    const d = t.dashboardPage;
    const greeting = getTimeOfDayGreeting({
      morning: d.greetingMorning,
      afternoon: d.greetingAfternoon,
      evening: d.greetingEvening,
      night: d.greetingNight,
    });
    addToast("success", buildWelcomeMessage(d.welcomeTemplate, greeting, displayName));
  }, [addToast, loading, t.dashboardPage, user?.fullName]);

  const planNames = t.settingsPage.subscription.planNames as Record<HrPlanId, string>;
  const planDisplay = t.settingsPage.subscription.userPlanTemplate.replace(
    "{{plan}}",
    planNames[planId]
  );

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
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopHeader
          breadcrumb={translatedBreadcrumb}
          pageTitle={translatedTitle}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
          user={{
            initials: user?.fullName ? getInitials(user.fullName) : loading ? "..." : "??",
            name: user?.fullName ?? (loading ? "..." : "User"),
            plan: planDisplay,
            avatarUrl: resolveAvatarUrl(user),
          }}
        />
        <main className="flex-1 overflow-y-auto hr-main-bg">
          <div className="hr-aurora-orb hr-aurora-orb--purple w-125 h-125 -top-30 -left-20" aria-hidden="true" />
          <div className="hr-aurora-orb hr-aurora-orb--cyan w-100 h-100 top-[30%] -right-15" aria-hidden="true" />
          <div className="hr-aurora-orb hr-aurora-orb--violet w-87.5 h-87.5 -bottom-20 left-[30%]" aria-hidden="true" />
          <div className="relative max-w-350 mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-7">{children}</div>
        </main>
        <GenerationProgressBadge />
      </div>
    </div>
  );
}
