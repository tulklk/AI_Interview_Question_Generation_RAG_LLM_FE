"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, LogOut, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "@/data/dashboard";
import { clearAuth } from "@/lib/auth";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <aside className="flex flex-col w-[250px] shrink-0 h-screen bg-white border-r border-gray-100 overflow-y-auto">
      {/* Logo */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#6c47ff] flex items-center justify-center shrink-0">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-gray-900 font-bold text-[15px] leading-tight">
              InterviewAI
            </p>
            <p className="text-gray-400 text-[11px] leading-tight">
              Question Generator
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 mt-6">
        <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">
          Main Menu
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
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
                    className={cn(
                      "shrink-0",
                      isActive ? "text-white" : "text-gray-400"
                    )}
                  />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
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

      {/* Quick Generate card */}
      <div className="px-4 mb-4">
        <div className="bg-[#f0edff] rounded-2xl p-4">
          <div className="w-8 h-8 rounded-lg bg-[#6c47ff]/15 flex items-center justify-center mb-3">
            <Sparkles size={15} className="text-[#6c47ff]" />
          </div>
          <p className="text-gray-800 font-semibold text-sm leading-snug">
            Quick Generate
          </p>
          <p className="text-gray-500 text-xs mt-1 leading-relaxed">
            Paste a JD and get questions in 30 seconds
          </p>
          <Link
            href="/generate"
            className="mt-3 inline-block text-xs font-semibold text-white bg-[#6c47ff] hover:bg-[#5535dd] px-4 py-2 rounded-xl transition-colors w-full text-center"
          >
            Start Now →
          </Link>
        </div>
      </div>

      {/* User profile */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#6c47ff] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">HR</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-800 text-sm font-semibold leading-tight truncate">
              HR Manager
            </p>
            <p className="text-gray-400 text-[11px] leading-tight truncate">
              hr@company.com
            </p>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
            Pro
          </span>
          <button
            onClick={handleLogout}
            title="Log out"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
