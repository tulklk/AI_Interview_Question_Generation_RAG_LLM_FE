"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Globe,
  Layers,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { isHrNavActive } from "@/shared/utils/nav";
import { navItems } from "@/features/dashboard/data/dashboard";
import { useLanguage } from "@/shared/providers/language-context";
import { useHrSubscription } from "@/features/hr/context/hr-subscription-context";
import { BrandLogo } from "@/shared/components/common/brand-logo";
import { SidebarUserFooter } from "@/features/hr/components/layout/sidebar-user-footer";
import { HrUpgradeModal } from "@/features/hr/components/billing/hr-upgrade-modal";
import type { HrPlanId } from "@/features/hr/types/hr-subscription";
import type { QuestionSetsFilterKey } from "@/features/hr/types/history-question-set";

const COLLAPSE_KEY = "hr-sidebar-collapsed";
const HISTORY_HREF = "/hr/history";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

const QUESTION_SET_SUB: {
  filter: QuestionSetsFilterKey;
  href: string;
  icon: typeof Layers;
  labelKey: "all" | "draft" | "published" | "bookmarked";
}[] = [
  { filter: "all", href: "/hr/history", icon: Layers, labelKey: "all" },
  { filter: "DRAFT", href: "/hr/history?filter=DRAFT", icon: FileText, labelKey: "draft" },
  { filter: "PUBLISHED", href: "/hr/history?filter=PUBLISHED", icon: Globe, labelKey: "published" },
  { filter: "bookmarked", href: "/hr/history?filter=bookmarked", icon: Bookmark, labelKey: "bookmarked" },
];

function parseFilter(raw: string | null): QuestionSetsFilterKey {
  if (raw === "DRAFT" || raw === "PUBLISHED" || raw === "bookmarked") return raw;
  return "all";
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { planId } = useHrSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const planShortBadge = t.settingsPage.subscription.planShortBadge as Record<HrPlanId, string>;
  const planNames = t.settingsPage.subscription.planNames as Record<HrPlanId, string>;
  const short = planShortBadge[planId]?.trim();
  const s = t.sidebar;

  const SEEN_KEY = "hg_nav_seen";
  const [seenTabs, setSeenTabs] = useState<Set<string>>(
    () => new Set(navItems.map((i) => i.href))
  );
  const [newBadgeReady, setNewBadgeReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const onHistoryRoute = pathname === HISTORY_HREF || pathname.startsWith(`${HISTORY_HREF}/`);
  const activeFilter = onHistoryRoute ? parseFilter(searchParams.get("filter")) : null;

  useEffect(() => {
    const stored = localStorage.getItem(SEEN_KEY);
    if (stored === null) {
      setSeenTabs(new Set());
    } else {
      try {
        setSeenTabs(new Set(JSON.parse(stored) as string[]));
      } catch {
        setSeenTabs(new Set(navItems.map((i) => i.href)));
      }
    }
    setNewBadgeReady(true);

    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!newBadgeReady) return;
    setSeenTabs((prev) => {
      if (prev.has(pathname)) return prev;
      const next = new Set(prev);
      next.add(pathname);
      localStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
      return next;
    });
  }, [pathname, newBadgeReady]);

  // Mở submenu Bộ câu hỏi khi đang ở route history
  useEffect(() => {
    if (onHistoryRoute) setHistoryOpen(true);
  }, [onHistoryRoute]);

  function markSeen(href: string) {
    setSeenTabs((prev) => {
      if (prev.has(href)) return prev;
      const next = new Set(prev);
      next.add(href);
      localStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  const handleNavClick = (href: string) => {
    markSeen(href);
    if (onClose) onClose();
  };

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const isCollapsed = hydrated ? collapsed : false;

  const sidebarContent = (desktop: boolean) => {
    const rail = desktop && isCollapsed;

    return (
      <aside className="flex flex-col w-full h-full overflow-y-auto hr-sidebar">
        <div
          className={cn(
            "pt-6 pb-2 flex items-center",
            rail ? "px-2 justify-center flex-col gap-2" : "px-5 justify-between"
          )}
        >
          <BrandLogo
            logoClassName="w-9 h-9"
            subtitleClassName={cn(
              "text-gray-400 dark:text-gray-500 text-[11px]",
              rail && "hidden"
            )}
            hideText={rail}
          />
          {desktop ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={rail ? s.expand : s.collapse}
              title={rail ? s.expand : s.collapse}
            >
              {rail ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className={cn("flex-1 mt-6", rail ? "px-2" : "px-4")}>
          {!rail && (
            <p className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">
              {s.sectionLabel}
            </p>
          )}
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isHistory = item.href === HISTORY_HREF;
              const isActive = isHrNavActive(item.href, pathname);
              const label = s.nav[item.href as keyof typeof s.nav] ?? item.label;
              const isNew = newBadgeReady && !seenTabs.has(item.href);
              const badgeLabel = isNew ? "New" : typeof item.badge === "number" ? String(item.badge) : null;

              if (isHistory && !rail) {
                return (
                  <li key={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-1 rounded-xl transition-all duration-200",
                        isActive
                          ? "hr-nav-active text-[#7C3AED] dark:text-[#a78bff] font-semibold"
                          : "text-[#6b7280] dark:text-gray-400"
                      )}
                    >
                      <Link
                        href={item.href}
                        onClick={() => {
                          setHistoryOpen(true);
                          handleNavClick(item.href);
                        }}
                        className={cn(
                          "flex flex-1 items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-base font-normal min-w-0",
                          !isActive &&
                            "hover:bg-[rgba(124,58,237,0.06)] dark:hover:bg-[rgba(124,58,237,0.08)] hover:text-charcoal dark:hover:text-gray-100"
                        )}
                      >
                        <div
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                            isActive ? "hr-icon-box" : "bg-gray-100 dark:bg-gray-800"
                          )}
                        >
                          <item.icon
                            size={15}
                            className={cn(
                              isActive ? "text-[#7C3AED] dark:text-[#a78bff]" : "text-[#9ca3af] dark:text-gray-500"
                            )}
                          />
                        </div>
                        <span className="text-sm font-medium flex-1 truncate">{label}</span>
                        {badgeLabel && (
                          <span
                            className={cn(
                              "text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none",
                              isActive
                                ? "bg-[rgba(124,58,237,0.12)] dark:bg-[rgba(124,58,237,0.2)] text-[#7C3AED] dark:text-[#a78bff]"
                                : "bg-page-bg dark:bg-gray-800 text-[#6b7280] dark:text-gray-400"
                            )}
                          >
                            {badgeLabel}
                          </span>
                        )}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setHistoryOpen((v) => !v)}
                        className="mr-1.5 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[rgba(124,58,237,0.08)] transition-colors shrink-0"
                        aria-expanded={historyOpen}
                        aria-label={historyOpen ? s.collapse : s.expand}
                      >
                        <ChevronDown
                          size={14}
                          className={cn("transition-transform duration-200", historyOpen && "rotate-180")}
                        />
                      </button>
                    </div>
                    {historyOpen && (
                      <ul className="mt-0.5 mb-1 ml-4 space-y-0.5 border-l border-[rgba(124,58,237,0.12)] dark:border-[rgba(124,58,237,0.2)] pl-2">
                        {QUESTION_SET_SUB.map((sub) => {
                          const subActive = onHistoryRoute && activeFilter === sub.filter;
                          const SubIcon = sub.icon;
                          return (
                            <li key={sub.filter}>
                              <Link
                                href={sub.href}
                                onClick={() => handleNavClick(HISTORY_HREF)}
                                className={cn(
                                  "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                                  subActive
                                    ? "bg-[rgba(124,58,237,0.1)] text-[#7C3AED] dark:bg-[rgba(124,58,237,0.18)] dark:text-[#a78bff]"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100"
                                )}
                              >
                                <SubIcon size={13} className="shrink-0 opacity-70" />
                                <span className="truncate">{s.questionSetsSub[sub.labelKey]}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => handleNavClick(item.href)}
                    title={rail ? label : undefined}
                    className={cn(
                      "flex items-center rounded-xl transition-all duration-200 text-base font-normal",
                      rail ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                      isActive
                        ? "hr-nav-active text-[#7C3AED] dark:text-[#a78bff] font-semibold"
                        : "text-[#6b7280] dark:text-gray-400 hover:bg-[rgba(124,58,237,0.06)] dark:hover:bg-[rgba(124,58,237,0.08)] hover:text-charcoal dark:hover:text-gray-100"
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                        isActive ? "hr-icon-box" : "bg-gray-100 dark:bg-gray-800"
                      )}
                    >
                      <item.icon
                        size={15}
                        className={cn(
                          isActive ? "text-[#7C3AED] dark:text-[#a78bff]" : "text-[#9ca3af] dark:text-gray-500"
                        )}
                      />
                    </div>
                    {!rail && (
                      <>
                        <span className="text-sm font-medium flex-1">{label}</span>
                        {badgeLabel && (
                          <span
                            className={cn(
                              "text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none",
                              isActive
                                ? "bg-[rgba(124,58,237,0.12)] dark:bg-[rgba(124,58,237,0.2)] text-[#7C3AED] dark:text-[#a78bff]"
                                : "bg-page-bg dark:bg-gray-800 text-[#6b7280] dark:text-gray-400"
                            )}
                          >
                            {badgeLabel}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {!rail && (
          <div className="px-4 mb-1">
            {planId === "HR_FREE" ? (
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <CreditCard size={12} className="text-gray-400 dark:text-gray-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 leading-tight truncate">
                    {planNames[planId]}
                  </p>
                  <p className="text-[10px] text-[#7C3AED] dark:text-[#a78bff] leading-tight">
                    {s.planSection.upgradeBtn}
                  </p>
                </div>
                {short && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800">
                    {short}
                  </span>
                )}
              </button>
            ) : (
              <Link
                href="/hr/settings?tab=billing"
                onClick={() => handleNavClick("/hr/settings")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              >
                <CreditCard size={12} className="text-gray-400 dark:text-gray-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 leading-tight truncate">
                    {planNames[planId]}
                  </p>
                  <p className="text-[10px] text-[#7C3AED] dark:text-[#a78bff] leading-tight">
                    {s.planSection.manageBtn}
                  </p>
                </div>
                {short && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60">
                    {short}
                  </span>
                )}
              </Link>
            )}
          </div>
        )}

        <SidebarUserFooter logoutTitle={s.logoutTitle} badge={null} collapsed={rail} />
      </aside>
    );
  };

  return (
    <>
      <div
        className={cn(
          "hidden lg:flex shrink-0 h-screen transition-[width] duration-200 ease-out",
          isCollapsed ? "w-16" : "w-62.5"
        )}
      >
        {sidebarContent(true)}
      </div>

      <div
        className={cn(
          "lg:hidden fixed inset-0 z-40 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!open}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-70 max-w-[82vw] transition-transform duration-300 ease-in-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarContent(false)}
        </div>
      </div>

      {showUpgradeModal && <HrUpgradeModal onClose={() => setShowUpgradeModal(false)} />}
    </>
  );
}
