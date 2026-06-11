"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn, isHrNavActive } from "@/lib/utils";
import { navItems } from "@/data/dashboard";
import { useLanguage } from "@/context/language-context";
import { useHrSubscription } from "@/context/hr-subscription-context";
import { BrandLogo } from "@/components/shared/brand-logo";
import { SidebarUserFooter } from "@/components/layout/sidebar-user-footer";
import type { HrPlanId } from "@/types/hr-subscription";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { planId } = useHrSubscription();
  const planShortBadge = t.settingsPage.subscription.planShortBadge as Record<HrPlanId, string>;
  const short = planShortBadge[planId]?.trim();
  const s = t.sidebar;

  return (
    <aside className="flex flex-col w-[250px] shrink-0 h-screen bg-white dark:bg-gray-950 border-r border-[#e5e7eb] dark:border-gray-800 overflow-y-auto">
      <div className="px-5 pt-6 pb-2">
        <BrandLogo
          logoClassName="w-9 h-9"
          subtitleClassName="text-gray-400 dark:text-gray-500 text-[11px]"
        />
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
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-base font-normal",
                    isActive
                      ? "bg-[rgba(108,71,255,0.1)] dark:bg-[#6c47ff]/15 text-[#6c47ff] font-medium"
                      : "text-[#6b7280] dark:text-gray-400 hover:bg-[rgba(108,71,255,0.05)] dark:hover:bg-gray-800 hover:text-[#111827] dark:hover:text-gray-100"
                  )}
                >
                  <item.icon
                    size={18}
                    className={cn(
                      "shrink-0",
                      isActive ? "text-[#6c47ff]" : "text-[#9ca3af] dark:text-gray-500"
                    )}
                  />
                  <span className="text-sm font-medium flex-1">{label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none",
                        isActive ? "bg-[#6c47ff]/15 text-[#6c47ff]" : "bg-[#f5f7fb] dark:bg-gray-800 text-[#6b7280] dark:text-gray-400"
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
        <div className="bg-[#f5f3ff] dark:bg-[#6c47ff]/10 rounded-xl p-4 border border-[#e5e7eb]/80 dark:border-gray-800">
          <div className="w-8 h-8 rounded-lg bg-[#6c47ff]/15 flex items-center justify-center mb-3">
            <Sparkles size={15} className="text-[#6c47ff]" />
          </div>
          <p className="text-gray-800 dark:text-gray-100 font-semibold text-sm leading-snug">
            {s.quickGenerate.title}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 leading-relaxed">{s.quickGenerate.desc}</p>
          <Link
            href="/hr/generate"
            className="mt-3 inline-block text-xs font-semibold text-white bg-[#6c47ff] hover:bg-[#5535dd] px-4 py-2 rounded-lg transition-colors w-full text-center"
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
                "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                planId === "basic" && "text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800",
                planId === "professional" && "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950",
                planId === "business" && "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950",
                planId === "enterprise" && "text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950"
              )}
            >
              {short}
            </span>
          ) : null
        }
      />
    </aside>
  );
}
