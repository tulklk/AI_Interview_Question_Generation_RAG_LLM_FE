"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useAdminDashboard } from "@/features/admin/hooks/use-admin-dashboard";
import { AdminHeader } from "./admin-header";
import { AdminRagStatus } from "./admin-rag-status";
import { AdminKpiGrid } from "./admin-kpi-grid";
import { AdminRecentUsers } from "./admin-recent-users";
import { AdminAlerts } from "./admin-alerts";
import { AdminAuditFeed } from "./admin-audit-feed";
import { AdminUserRoleChart } from "./admin-user-role-chart";
import { AdminPlatformBarChart } from "./admin-platform-bar-chart";

/** Build per-section entrance props with staggered delay */
function sec(i: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.42, delay: i * 0.07, ease: "easeOut" as const },
  };
}

/**
 * Platform Operations & Intelligence Center — admin dashboard.
 *
 * Real data (from existing APIs):
 *   - Total users, HR manager count, job seeker count  → /api/users
 *   - Company list + total count                       → /api/companies
 *   - Recent user registrations                        → /api/users (page 1)
 *
 * Pending backend integration (shown as honest placeholders):
 *   - Generation activity chart → requires GET /api/admin/sessions
 *   - Audit log feed            → requires GET /api/admin/audit
 *   - Questions generated count → requires GET /api/admin/stats
 *   - Practice sessions count   → requires candidate sessions API
 *   - System health status      → requires health-check endpoints
 */
export function AdminDashboard() {
  const { t } = useLanguage();
  const d = t.adminPages.dashboard;
  const { data, loading, error, lastFetched, reload } = useAdminDashboard();

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div {...sec(0)}>
        <AdminHeader lastUpdated={lastFetched} loading={loading} onRefresh={reload} />
      </motion.div>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
        >
          <AlertCircle size={15} className="text-red-500 shrink-0" />
          <p className={cn("text-[13px] text-red-600 dark:text-red-400 flex-1")}>
            {t.adminPages.users.loadError}
          </p>
          <button
            type="button"
            onClick={reload}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-red-600 dark:text-red-400 hover:underline"
          >
            <RefreshCw size={11} />
            {t.adminPages.users.retry}
          </button>
        </motion.div>
      )}

      {/* ── RAG system status ──────────────────────────────────────────────── */}
      <motion.div {...sec(1)}>
        <AdminRagStatus />
      </motion.div>

      {/* ── KPI grid (4 real + 2 pending) ─────────────────────────────────── */}
      <motion.div {...sec(2)}>
        <AdminKpiGrid data={data} loading={loading} />
      </motion.div>

      {/* ── Row 1: Recent registrations + Platform alerts ──────────────────── */}
      <motion.div {...sec(3)}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
          <AdminRecentUsers users={data?.recentUsers ?? []} loading={loading} />
          <AdminAlerts data={data} loading={loading} />
        </div>
      </motion.div>

      {/* ── Row 2: User role donut + Platform bar chart ────────────────────── */}
      <motion.div {...sec(4)}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <AdminUserRoleChart data={data} loading={loading} />
          <AdminPlatformBarChart data={data} loading={loading} />
        </div>
      </motion.div>

      {/* ── Audit feed ─────────────────────────────────────────────────────── */}
      <motion.div {...sec(5)}>
        <AdminAuditFeed />
      </motion.div>
    </div>
  );
}
