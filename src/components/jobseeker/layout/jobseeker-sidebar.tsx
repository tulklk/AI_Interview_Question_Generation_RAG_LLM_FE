"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { jobseekerNavItems } from "@/data/jobseeker";
import { useLanguage } from "@/context/language-context";
import { BrandLogo } from "@/components/shared/brand-logo";
import { SidebarUserFooter } from "@/components/layout/sidebar-user-footer";

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.12 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -14 },
  show: { opacity: 1, x: 0, transition: { duration: 0.22 } },
};

interface JobseekerSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function JobseekerSidebar({ open, onClose }: JobseekerSidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const s = t.jobseekerSidebar;

  const sidebarContent = (
    <>
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
          {jobseekerNavItems.map((item) => {
            const isActive =
              item.href === "/jobseeker"
                ? pathname === "/jobseeker"
                : item.href !== "/jobseeker/settings"
                ? pathname.startsWith(item.href)
                : pathname === item.href;
            const label = s.nav[item.href as keyof typeof s.nav] ?? item.label;

            return (
              <motion.li key={item.href} variants={itemVariants}>
                <Link
                  href={item.href}
                  onClick={() => onClose?.()}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                    isActive
                      ? "hr-nav-active text-[#7C3AED] dark:text-[#a78bff] font-semibold"
                      : "text-[#6b7280] dark:text-gray-400 hover:bg-[rgba(124,58,237,0.06)] dark:hover:bg-[rgba(124,58,237,0.08)] hover:text-charcoal dark:hover:text-gray-100"
                  )}
                >
                  {/* 3D icon box — same as HR sidebar */}
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
                          : item.badgeVariant === "new"
                          ? "bg-[rgba(124,58,237,0.08)] dark:bg-[rgba(124,58,237,0.15)] text-[#7C3AED] dark:text-[#a78bff]"
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

      {/* Practice CTA */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3, ease: "easeOut" }}
        className="px-4 mb-4"
      >
        <div className="hr-quick-generate rounded-xl p-4">
          <div className="w-8 h-8 rounded-lg hr-icon-box flex items-center justify-center mb-3">
            <BookOpen size={15} className="text-[#7C3AED] dark:text-[#a78bff]" />
          </div>
          <p className="text-gray-800 dark:text-gray-100 font-semibold text-sm leading-snug">
            {s.practiceNow.title}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 leading-relaxed">
            {s.practiceNow.desc}
          </p>
          <Link
            href="/jobseeker"
            onClick={() => onClose?.()}
            className="shimmer-button mt-3 inline-block text-xs font-semibold text-white hr-cta-btn px-4 py-2 rounded-lg w-full text-center"
          >
            {s.practiceNow.btn}
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.25 }}
      >
        <SidebarUserFooter
          logoutTitle={s.logoutTitle}
          badge={
            <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950 px-2 py-0.5 rounded-full shrink-0">
              Free
            </span>
          }
        />
      </motion.div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[250px] shrink-0 h-screen hr-sidebar overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-40 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        {/* Drawer */}
        <aside
          className={cn(
            "absolute left-0 top-0 h-full w-72 max-w-[82vw] hr-sidebar overflow-y-auto transition-transform duration-300 ease-in-out flex flex-col",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={16} />
          </button>
          {sidebarContent}
        </aside>
      </div>
    </>
  );
}
