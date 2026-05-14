"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { cn, isAdminNavActive } from "@/lib/utils";
import { adminNavItems } from "@/data/admin";
import { clearAuth } from "@/lib/auth";
import { useLanguage } from "@/context/language-context";
import { BrandLogo } from "@/components/shared/brand-logo";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const s = t.adminSidebar;

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <aside className="flex flex-col w-[250px] shrink-0 h-screen bg-white border-r border-[#e5e7eb] overflow-y-auto">
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
          {adminNavItems.map((item) => {
            const isActive = isAdminNavActive(item.href, pathname);
            const label = s.nav[item.href as keyof typeof s.nav] ?? item.label;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-base font-normal",
                    isActive
                      ? "bg-[rgba(108,71,255,0.1)] text-[#6c47ff] font-medium"
                      : "text-[#6b7280] hover:bg-[rgba(108,71,255,0.05)] hover:text-[#111827]"
                  )}
                >
                  <item.icon
                    size={18}
                    className={cn(
                      "shrink-0",
                      isActive ? "text-[#6c47ff]" : "text-[#9ca3af]"
                    )}
                  />
                  <span className="text-sm font-medium flex-1">{label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none",
                        isActive ? "bg-[#6c47ff]/15 text-[#6c47ff]" : "bg-[#f5f7fb] text-[#6b7280]"
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
        <div className="bg-[#f5f3ff] rounded-xl p-4 border border-[#e5e7eb]/80">
          <div className="w-8 h-8 rounded-lg bg-[#6c47ff]/15 flex items-center justify-center mb-3">
            <ShieldCheck size={15} className="text-[#6c47ff]" />
          </div>
          <p className="text-gray-800 font-semibold text-sm leading-snug">
            {s.systemStatus.title}
          </p>
          <p className="text-gray-500 text-xs mt-1 leading-relaxed">{s.systemStatus.desc}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span className="text-xs font-semibold text-emerald-600">{s.systemStatus.online}</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-t border-[#e5e7eb]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#6c47ff] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">AD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-800 text-sm font-semibold leading-tight truncate">Administrator</p>
            <p className="text-gray-400 text-[11px] leading-tight truncate">admin@interviewai.io</p>
          </div>
          <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full shrink-0">
            Admin
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
