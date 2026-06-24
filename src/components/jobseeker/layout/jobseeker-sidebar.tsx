"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { jobseekerNavItems } from "@/data/jobseeker";
import { useLanguage } from "@/context/language-context";
import { BrandLogo } from "@/components/shared/brand-logo";
import { SidebarUserFooter } from "@/components/layout/sidebar-user-footer";

export function JobseekerSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const s = t.jobseekerSidebar;

  return (
    <aside className="flex flex-col w-[250px] shrink-0 h-screen hr-sidebar overflow-y-auto">
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
          {jobseekerNavItems.map((item) => {
            const isActive =
              item.href === "/jobseeker"
                ? pathname === "/jobseeker"
                : pathname.startsWith(item.href) && item.href !== "/jobseeker/settings"
                  ? true
                  : pathname === item.href;
            const label = s.nav[item.href as keyof typeof s.nav] ?? item.label;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive
                      ? "hr-nav-active text-[#7C3AED] dark:text-[#a78bff]"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-800 dark:hover:text-gray-100"
                  )}
                >
                  <item.icon
                    size={18}
                    className={cn("shrink-0", isActive ? "text-[#7C3AED] dark:text-[#a78bff]" : "text-gray-400 dark:text-gray-500")}
                  />
                  <span className="text-sm font-medium flex-1">{label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none",
                        isActive
                          ? "bg-[#7C3AED]/10 text-[#7C3AED] dark:text-[#a78bff]"
                          : item.badgeVariant === "new"
                          ? "bg-[#7C3AED]/10 text-[#7C3AED] dark:text-[#a78bff]"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
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

      {/* Practice CTA */}
      <div className="px-4 mb-4">
        <div className="hr-quick-generate rounded-xl p-4">
          <div className="hr-icon-box w-8 h-8 rounded-lg flex items-center justify-center mb-3">
            <BookOpen size={15} className="text-[#7C3AED] dark:text-[#a78bff]" />
          </div>
          <p className="text-gray-800 dark:text-gray-100 font-semibold text-sm leading-snug">
            {s.practiceNow.title}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 leading-relaxed">{s.practiceNow.desc}</p>
          <Link
            href="/jobseeker"
            className="shimmer-button mt-3 inline-block text-xs font-semibold text-white hr-cta-btn px-4 py-2 rounded-lg w-full text-center"
          >
            {s.practiceNow.btn}
          </Link>
        </div>
      </div>

      <SidebarUserFooter
        logoutTitle={s.logoutTitle}
        badge={
          <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950 px-2 py-0.5 rounded-full shrink-0">
            Free
          </span>
        }
      />
    </aside>
  );
}
