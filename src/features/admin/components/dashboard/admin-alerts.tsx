"use client";

import { AlertTriangle, CheckCircle2, Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import type { AdminDashboardStats } from "@/features/admin/services/admin-dashboard.service";

// ---------------------------------------------------------------------------
// Alert derivation — based purely on real API data, no fake values
// ---------------------------------------------------------------------------

interface Alert {
  id: string;
  severity: "warning" | "info";
  title: string;
  desc: string;
}

interface AlertLabels {
  noCompanies: string;
  noCompaniesDesc: string;
  noHrManagers: string;
  noHrManagersDesc: string;
}

function deriveAlerts(data: AdminDashboardStats, labels: AlertLabels): Alert[] {
  const alerts: Alert[] = [];

  if (data.totalCompanies === 0) {
    alerts.push({
      id: "no-companies",
      severity: "warning",
      title: labels.noCompanies,
      desc: labels.noCompaniesDesc,
    });
  }

  if (data.hrManagers === 0 && data.totalUsers > 0) {
    alerts.push({
      id: "no-hr-managers",
      severity: "warning",
      title: labels.noHrManagers,
      desc: labels.noHrManagersDesc,
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface AdminAlertsProps {
  data: AdminDashboardStats | null;
  loading: boolean;
}

export function AdminAlerts({ data, loading }: AdminAlertsProps) {
  const { t } = useLanguage();
  const d = t.adminPages.dashboard.alertsPanel;

  const alerts = data ? deriveAlerts(data, d) : [];

  return (
    <div className="hr-glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
          <Bell size={14} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className={cn("text-sm font-bold leading-tight", portalHeadingAlt)}>{d.title}</h2>
          <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{d.subtitle}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2">
        {loading ? (
          <>
            <div className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse opacity-60" />
          </>
        ) : alerts.length === 0 ? (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">
                {d.noAlerts}
              </p>
              <p className="text-[11px] text-emerald-600/70 dark:text-emerald-500/70 mt-0.5">
                {d.noAlertsDesc}
              </p>
            </div>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 p-3.5 rounded-xl border",
                alert.severity === "warning"
                  ? "bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40"
                  : "bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40"
              )}
            >
              <AlertTriangle
                size={14}
                className={cn(
                  "shrink-0 mt-0.5",
                  alert.severity === "warning"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-blue-500 dark:text-blue-400"
                )}
              />
              <div>
                <p
                  className={cn(
                    "text-[12px] font-semibold",
                    alert.severity === "warning"
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-blue-700 dark:text-blue-400"
                  )}
                >
                  {alert.title}
                </p>
                <p
                  className={cn(
                    "text-[11px] mt-0.5 leading-snug",
                    alert.severity === "warning"
                      ? "text-amber-600/70 dark:text-amber-500/70"
                      : "text-blue-600/70 dark:text-blue-500/70"
                  )}
                >
                  {alert.desc}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
