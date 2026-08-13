"use client";

import type { ReactNode } from "react";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopHeader } from "./top-header";
import { GenerationProgressBadge } from "@/features/interview/components/generate/generation-progress-badge";
import { StudioProgressBadge } from "@/features/studio/components/studio-progress-badge";
import { useLanguage } from "@/shared/providers/language-context";
import { useDocumentTitle } from "@/shared/hooks/use-document-title";
import { useToast } from "@/shared/providers/toast-context";
import { useHrSubscription } from "@/features/hr/context/hr-subscription-context";
import { useUser } from "@/features/auth/context/user-context";
import { buildWelcomeMessage, getTimeOfDayGreeting } from "@/shared/utils/greeting";
import { clearLoginWelcomePending, hasLoginWelcomePending } from "@/features/auth/utils/login-welcome";
import { getInitials, resolveAvatarUrl } from "@/shared/utils/user-display";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import type { HrPlanId } from "@/features/hr/types/hr-subscription";
import type { NotificationItem } from "@/shared/components/common/notification-bell";
import { listProjects } from "@/features/studio/services/studio.service";
import { PremiumCelebrationDialog } from "@/shared/components/ui/premium-celebration-dialog";
import { PremiumRevokedDialog } from "@/shared/components/ui/premium-revoked-dialog";
import { HrUpgradeModal } from "@/features/hr/components/billing/hr-upgrade-modal";

interface AppShellProps {
  children: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  pageTitle: string;
  /** Bỏ max-w-350 — Studio/trang rộng dùng hết chiều ngang main */
  fullWidth?: boolean;
}

export function AppShell({ children, breadcrumb, pageTitle, fullWidth = false }: AppShellProps) {
  const { t, lang } = useLanguage();
  const pathname = usePathname();
  const { planId, refresh } = useHrSubscription();
  const { user, loading } = useUser();
  const { addToast } = useToast();
  const welcomedRef = useRef(false);
  const prevPlanIdRef = useRef<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showRevoked, setShowRevoked] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Show Premium celebration once per plan period (payment OR admin grant).
  // Only clear the localStorage flag on a genuine HR_PREMIUM → HR_FREE downgrade
  // (prev === "HR_PREMIUM"). Prevents the initial "HR_FREE" mount state from
  // wiping the flag before the subscription refresh returns "HR_PREMIUM".
  useEffect(() => {
    if (!user?.id) return;
    const prev = prevPlanIdRef.current;
    prevPlanIdRef.current = planId;

    const key = `hiregen_hr_premium_ok_${user.id}`;
    if (planId === "HR_PREMIUM") {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
        setShowCelebration(true);
      }
    } else if (prev === "HR_PREMIUM") {
      // Genuine downgrade confirmed from API:
      // 1. Clear localStorage so the next upgrade fires the celebration again.
      // 2. Show the "Premium revoked" panel so the user knows their plan changed.
      localStorage.removeItem(key);
      setShowRevoked(true);
    }
  }, [planId, user?.id]);

  // Refresh subscription when user returns to this tab so that admin-granted
  // upgrades or revocations are picked up without a full page reload.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Notifications từ Studio projects (Generated) — không gọi V1 jobs.
  useEffect(() => {
    let cancelled = false;
    listProjects()
      .then((projects) => {
        if (cancelled) return;
        const items: NotificationItem[] = (projects ?? [])
          .filter((p) => String(p.status).toLowerCase() === "generated")
          .slice(0, 5)
          .map((p) => ({
            id: p.id,
            message: t.notificationMessages.hrQuestionsGenerated.replace(
              "{{title}}",
              p.name || "—"
            ),
            time: formatRelativeTime(new Date().toISOString(), lang),
            read: false,
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

  useDocumentTitle(translatedTitle);

  const translatedBreadcrumb = breadcrumb?.map((crumb) => ({
    ...crumb,
    label:
      t.appShell.breadcrumb[crumb.label.toLowerCase() as keyof typeof t.appShell.breadcrumb] ??
      crumb.label,
  }));

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <Suspense
          fallback={<div className="hidden lg:flex w-62.5 shrink-0 h-screen hr-sidebar" aria-hidden />}
        >
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </Suspense>
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
            <div
              className={
                fullWidth
                  ? "relative w-full max-w-none px-3 sm:px-4 py-4 md:py-5"
                  : "relative max-w-350 mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-7"
              }
            >
              {children}
            </div>
          </main>
          <GenerationProgressBadge />
          <StudioProgressBadge />
        </div>
      </div>

      <PremiumCelebrationDialog
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
      />

      <PremiumRevokedDialog
        open={showRevoked}
        onClose={() => setShowRevoked(false)}
        onUpgrade={() => setShowUpgradeModal(true)}
        audience="hr"
      />

      {showUpgradeModal && (
        <HrUpgradeModal onClose={() => { setShowUpgradeModal(false); void refresh(); }} />
      )}
    </>
  );
}
