"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
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
import { formatRelativeTime } from "@/shared/utils/relative-time";
import type { NotificationItem } from "@/shared/components/common/notification-bell";
import { listCompletedSessions } from "@/features/candidate/services/practice-session.service";
import { listInvitations } from "@/features/candidate/services/invitation.service";
import { ScoringProgressBadge } from "@/features/candidate/components/ui/scoring-progress-badge";
import {
  CandidateSubscriptionProvider,
  useCandidateSubscription,
} from "@/features/candidate/context/candidate-subscription-context";
import { UpgradeModal } from "@/features/candidate/components/billing/upgrade-modal";

const UNREAD_WINDOW_MS = 24 * 60 * 60 * 1000;

interface JobseekerAppShellProps {
  children: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  pageTitle: string;
  fullWidth?: boolean;
}

function JobseekerAppShellInner({
  children,
  breadcrumb,
  pageTitle,
  fullWidth = false,
}: JobseekerAppShellProps) {
  const { t, lang } = useLanguage();
  const pathname = usePathname();
  const { addToast } = useToast();
  const { user, loading } = useUser();
  const { planType, refreshSubscription } = useCandidateSubscription();
  const welcomedRef = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Body scroll lock when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  // Derive notifications from recently completed practice sessions (feedback ready)
  // and pending interview invitations, merged and sorted by recency.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listCompletedSessions({ pageSize: 5 }),
      listInvitations().catch(() => []),
    ])
      .then(([sessionsRes, invitations]) => {
        if (cancelled) return;

        const feedbackEntries = sessionsRes.items.map((s) => ({
          id: s.id,
          iso: s.completedAt,
          message: t.notificationMessages.candidateFeedbackReady.replace("{{title}}", s.setTitle || "—"),
          href: `/jobseeker/practice/${s.id}/result`,
        }));

        const invitationEntries = invitations
          .filter((i) => i.status === "PENDING")
          .map((i) => ({
            id: i.id,
            iso: i.createdAt,
            message: t.notificationMessages.candidateInvitationReceived
              .replace("{{company}}", i.companyName || "—")
              .replace("{{title}}", i.questionSetTitle || "—"),
            href: "/jobseeker/invitations",
          }));

        const items: NotificationItem[] = [...feedbackEntries, ...invitationEntries]
          .sort((a, b) => new Date(b.iso ?? 0).getTime() - new Date(a.iso ?? 0).getTime())
          .slice(0, 5)
          .map((entry) => ({
            id: entry.id,
            message: entry.message,
            time: formatRelativeTime(entry.iso ?? undefined, lang),
            read: !entry.iso || Date.now() - new Date(entry.iso).getTime() > UNREAD_WINDOW_MS,
            href: entry.href,
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
    <>
    <div className="flex h-screen overflow-hidden">
      <JobseekerSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenUpgrade={() => setShowUpgrade(true)}
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
            plan: planType === "PREMIUM" ? "Premium" : "Free",
            avatarUrl: resolveAvatarUrl(user),
          }}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden hr-main-bg scrollbar-hide">
          {/* Aurora orbs — visible in dark mode only */}
          <div className="hr-aurora-orb hr-aurora-orb--purple w-130 h-130 -top-20 -left-15" aria-hidden="true" />
          <div className="hr-aurora-orb hr-aurora-orb--cyan w-100 h-100 bottom-[10%] -right-10" aria-hidden="true" />
          <div className="hr-aurora-orb hr-aurora-orb--violet w-80 h-80 top-[40%] left-[30%]" aria-hidden="true" />
          <div className={cn(
            "relative z-10 py-5 md:py-7",
            fullWidth ? "px-4 sm:px-6 md:px-8" : "max-w-350 mx-auto px-4 sm:px-6 md:px-8"
          )}>{children}</div>
        </main>
      </div>
      <ScoringProgressBadge />
    </div>

    {showUpgrade && (
      <UpgradeModal
        onClose={() => setShowUpgrade(false)}
        onDone={() => { void refreshSubscription(); }}
      />
    )}
    </>
  );
}

export function JobseekerAppShell(props: JobseekerAppShellProps) {
  return (
    <CandidateSubscriptionProvider>
      <JobseekerAppShellInner {...props} />
    </CandidateSubscriptionProvider>
  );
}
