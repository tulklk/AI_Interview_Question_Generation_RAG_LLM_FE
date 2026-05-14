"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { jobseekerNavItems } from "@/data/jobseeker";
import { clearAuth } from "@/lib/auth";
import { useLanguage } from "@/context/language-context";
import { BrandLogo } from "@/components/shared/brand-logo";

export function JobseekerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const s = t.jobseekerSidebar;

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <aside className="flex flex-col w-[250px] shrink-0 h-screen bg-white border-r border-gray-100 overflow-y-auto">
      <div className="px-5 pt-6 pb-2">
        <BrandLogo
          logoClassName="w-9 h-9"
          subtitleClassName="text-gray-400 text-[11px]"
        />
      </div>

      <nav className="flex-1 px-4 mt-6">
        <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">
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
                      ? "bg-[#6c47ff] text-white"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  )}
                >
                  <item.icon
                    size={18}
                    className={cn("shrink-0", isActive ? "text-white" : "text-gray-400")}
                  />
                  <span className="text-sm font-medium flex-1">{label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none",
                        isActive
                          ? "bg-white/20 text-white"
                          : item.badgeVariant === "new"
                          ? "bg-[#6c47ff]/10 text-[#6c47ff]"
                          : "bg-gray-100 text-gray-500"
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
        <div className="bg-[#f0edff] rounded-xl p-4">
          <div className="w-8 h-8 rounded-lg bg-[#6c47ff]/15 flex items-center justify-center mb-3">
            <BookOpen size={15} className="text-[#6c47ff]" />
          </div>
          <p className="text-gray-800 font-semibold text-sm leading-snug">
            {s.practiceNow.title}
          </p>
          <p className="text-gray-500 text-xs mt-1 leading-relaxed">{s.practiceNow.desc}</p>
          <Link
            href="/jobseeker"
            className="mt-3 inline-block text-xs font-semibold text-white bg-primary hover:bg-primary-hover px-4 py-2 rounded-lg transition-colors w-full text-center"
          >
            {s.practiceNow.btn}
          </Link>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#6c47ff] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">AJ</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-800 text-sm font-semibold leading-tight truncate">Alex Johnson</p>
            <p className="text-gray-400 text-[11px] leading-tight truncate">alex@example.com</p>
          </div>
          <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full shrink-0">
            Free
          </span>
          <button
            onClick={handleLogout}
            title={s.logoutTitle}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
