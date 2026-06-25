"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { cn, isAdminNavActive } from "@/lib/utils";
import { adminNavItems } from "@/data/admin";
import { useLanguage } from "@/context/language-context";
import { useLogout } from "@/hooks/use-logout";
import { BrandLogo } from "@/components/shared/brand-logo";

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.12 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -14 },
  show: { opacity: 1, x: 0, transition: { duration: 0.22 } },
};

export function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { logout, loggingOut } = useLogout();
  const s = t.adminSidebar;

  return (
    <aside className="hr-sidebar flex flex-col w-62.5 shrink-0 h-screen overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="px-5 pt-6 pb-2"
      >
        <BrandLogo
          logoClassName="w-9 h-9"
          subtitleClassName="text-gray-400 dark:text-gray-500 text-[11px]"
        />
      </motion.div>

      <nav className="flex-1 px-4 mt-6">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.25 }}
          className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold uppercase tracking-widest px-2 mb-2"
        >
          {s.sectionLabel}
        </motion.p>

        <motion.ul
          className="space-y-0.5"
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          {adminNavItems.map((item) => {
            const isActive = isAdminNavActive(item.href, pathname);
            const label = s.nav[item.href as keyof typeof s.nav] ?? item.label;

            return (
              <motion.li key={item.href} variants={itemVariants}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                    isActive
                      ? "hr-nav-active text-[#7C3AED] dark:text-[#a78bff] font-semibold"
                      : "text-[#6b7280] dark:text-gray-400 hover:bg-[rgba(124,58,237,0.06)] dark:hover:bg-[rgba(124,58,237,0.08)] hover:text-charcoal dark:hover:text-gray-100"
                  )}
                >
                  {/* 3D icon box — matches HR/Jobseeker sidebar style */}
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                      isActive
                        ? "hr-icon-box"
                        : "bg-gray-100 dark:bg-gray-800 group-hover:bg-[rgba(124,58,237,0.08)] dark:group-hover:bg-[rgba(124,58,237,0.12)]"
                    )}
                  >
                    <item.icon
                      size={15}
                      className={cn(
                        "transition-colors duration-200",
                        isActive
                          ? "text-[#7C3AED] dark:text-[#a78bff]"
                          : "text-[#9ca3af] dark:text-gray-500 group-hover:text-[#7C3AED] dark:group-hover:text-[#a78bff]"
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
                          : "bg-page-bg dark:bg-gray-800 text-[#6b7280] dark:text-gray-400"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      </nav>

      {/* System Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3, ease: "easeOut" }}
        className="px-4 mb-4"
      >
        <div className="hr-quick-generate rounded-xl p-4">
          <div className="w-8 h-8 rounded-lg hr-icon-box flex items-center justify-center mb-3">
            <ShieldCheck size={15} className="text-[#7C3AED] dark:text-[#a78bff]" />
          </div>
          <p className="text-gray-800 dark:text-gray-100 font-semibold text-sm leading-snug">
            {s.systemStatus.title}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 leading-relaxed">
            {s.systemStatus.desc}
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {s.systemStatus.online}
            </span>
          </div>
        </div>
      </motion.div>

      {/* User Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.25 }}
        className="px-4 py-4 border-t border-black/5 dark:border-white/8"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#7C3AED] to-[#06B6D4] flex items-center justify-center shrink-0 hr-avatar-ring">
            <span className="text-white text-xs font-bold">AD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-800 dark:text-gray-100 text-sm font-semibold leading-tight truncate">
              Administrator
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-[11px] leading-tight truncate">
              admin@interviewai.io
            </p>
          </div>
          <span className="text-[10px] font-bold text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded-full shrink-0">
            Admin
          </span>
          <button
            type="button"
            onClick={() => void logout()}
            disabled={loggingOut}
            title={s.logoutTitle}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-[#7C3AED] dark:hover:text-[#a78bff] hover:bg-[rgba(124,58,237,0.08)] dark:hover:bg-[rgba(124,58,237,0.12)] transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loggingOut ? (
              <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-[#7C3AED] rounded-full animate-spin" />
            ) : (
              <LogOut size={14} />
            )}
          </button>
        </div>
      </motion.div>
    </aside>
  );
}
