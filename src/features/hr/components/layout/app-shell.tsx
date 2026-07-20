"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopHeader } from "./top-header";
import { GenerationProgressBadge } from "@/features/interview/components/generate/generation-progress-badge";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { useHrSubscription } from "@/features/hr/context/hr-subscription-context";
import { useUser } from "@/features/auth/context/user-context";
import { buildWelcomeMessage, getTimeOfDayGreeting } from "@/shared/utils/greeting";
import { clearLoginWelcomePending, hasLoginWelcomePending } from "@/features/auth/utils/login-welcome";
import { getInitials, resolveAvatarUrl } from "@/shared/utils/user-display";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import type { HrPlanId } from "@/features/hr/types/hr-subscription";
import type { NotificationItem } from "@/shared/components/common/notification-bell";
import { getGenerationJobs } from "@/features/interview/services/interview.service";

const UNREAD_WINDOW_MS = 24 * 60 * 60 * 1000;

interface AppShellProps {
  children: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  pageTitle: string;
}

export function AppShell({ children, breadcrumb, pageTitle }: AppShellProps) {
  const { t, lang } = useLanguage();
  const pathname = usePathname();
  const { planId } = useHrSubscription();
  const { user, loading } = useUser();
  const { addToast } = useToast();
  const welcomedRef = useRef(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Derive notifications from recently completed generation jobs.
  useEffect(() => {
    let cancelled = false;
    getGenerationJobs()
      .then((jobs) => {
        if (cancelled) return;
        const items: NotificationItem[] = jobs
          .filter((j) => j.status === "COMPLETED")
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5)
          .map((j) => ({
            id: j.id,
            message: t.notificationMessages.hrQuestionsGenerated.replace("{{title}}", j.jobTitle || "—"),
            time: formatRelativeTime(j.updatedAt, lang),
            read: Date.now() - new Date(j.updatedAt).getTime() > UNREAD_WINDOW_MS,
          }));
        setNotifications(items);
      })
      .catch(() => {
        // Non-critical — bell just shows empty.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const planShortBadge = t.settingsPage.subscription.planShortBadge as Record<HrPlanId, string>;
  const planDisplay = planShortBadge[planId]?.trim() || planNames[planId];

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
          notifications={notifications}
          user={{
            initials: user?.fullName ? getInitials(user.fullName) : loading ? "..." : "??",
            name: user?.fullName ?? (loading ? "..." : "User"),
            plan: planDisplay,
            avatarUrl: resolveAvatarUrl(user),
          }}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden hr-main-bg scrollbar-hide">
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
