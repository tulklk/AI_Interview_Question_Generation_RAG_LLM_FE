"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { cn, isHrNavActive } from "@/lib/utils";
import { navItems } from "@/data/dashboard";
import { useLanguage } from "@/context/language-context";
import { useHrSubscription } from "@/context/hr-subscription-context";
import { BrandLogo } from "@/components/shared/brand-logo";
import { SidebarUserFooter } from "@/components/layout/sidebar-user-footer";
import type { HrPlanId } from "@/types/hr-subscription";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { planId } = useHrSubscription();
  const planShortBadge = t.settingsPage.subscription.planShortBadge as Record<HrPlanId, string>;
  const short = planShortBadge[planId]?.trim();
  const s = t.sidebar;

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const sidebarContent = (
    <aside className="flex flex-col w-full h-full overflow-y-auto hr-sidebar">
      <div className="px-5 pt-6 pb-2 flex items-center justify-between">
        <BrandLogo
          logoClassName="w-9 h-9"
          subtitleClassName="text-gray-400 dark:text-gray-500 text-[11px]"
        />
        {/* Close button — mobile only */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-4 mt-6">
        <p className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">
          {s.sectionLabel}
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = isHrNavActive(item.href, pathname);
            const label = s.nav[item.href as keyof typeof s.nav] ?? item.label;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-base font-normal",
                    isActive
                      ? "hr-nav-active text-[#7C3AED] dark:text-[#a78bff] font-semibold"
                      : "text-[#6b7280] dark:text-gray-400 hover:bg-[rgba(124,58,237,0.06)] dark:hover:bg-[rgba(124,58,237,0.08)] hover:text-[#111827] dark:hover:text-gray-100"
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                      isActive
                        ? "hr-icon-box"
                        : "bg-gray-100 dark:bg-gray-800"
                    )}
                  >
                    <item.icon
                      size={15}
                      className={cn(
                        isActive ? "text-[#7C3AED] dark:text-[#a78bff]" : "text-[#9ca3af] dark:text-gray-500"
                      )}
                    />
                  </div>
                  <span className="text-sm font-medium flex-1">{label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none",
                        isActive
                          ? "bg-[rgba(124,58,237,0.12)] dark:bg-[rgba(124,58,237,0.2)] text-[#7C3AED] dark:text-[#a78bff]"
                          : "bg-[#f5f7fb] dark:bg-gray-800 text-[#6b7280] dark:text-gray-400"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-4 mb-4">
        <div className="hr-quick-generate rounded-xl p-4">
          <div className="w-8 h-8 rounded-lg hr-icon-box flex items-center justify-center mb-3">
            <Sparkles size={15} className="text-[#7C3AED]" />
          </div>
          <p className="text-gray-800 dark:text-gray-100 font-semibold text-sm leading-snug">
            {s.quickGenerate.title}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 leading-relaxed">{s.quickGenerate.desc}</p>
          <Link
            href="/hr/generate"
            onClick={handleNavClick}
            className="mt-3 shimmer-button inline-block text-xs font-semibold text-white hr-cta-btn px-4 py-2 rounded-lg w-full text-center"
          >
            {s.quickGenerate.btn}
          </Link>
        </div>
      </div>

      <SidebarUserFooter
        logoutTitle={s.logoutTitle}
        badge={
          short ? (
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 hr-plan-badge",
                planId === "basic" && "text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800",
                planId === "professional" && "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60",
                planId === "business" && "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60",
                planId === "enterprise" && "text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60"
              )}
            >
              {short}
            </span>
          ) : null
        }
      />
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <div className="hidden lg:flex w-62.5 shrink-0 h-screen">
        {sidebarContent}
      </div>

      {/* Mobile drawer overlay */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-40 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        {/* Drawer panel */}
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-70 max-w-[82vw] transition-transform duration-300 ease-in-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
