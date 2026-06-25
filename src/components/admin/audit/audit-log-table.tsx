"use client";

import type { AuditLogEntry } from "@/types/admin";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";
import { portalDivider, portalHeadingAlt, portalSubtextAlt } from "@/lib/portal-ui";

interface AuditLogTableProps {
  entries: AuditLogEntry[];
}

const eventBadge: Record<string, { bg: string; color: string }> = {
  user_created:    { bg: "bg-blue-50 dark:bg-blue-950/40",    color: "text-blue-600 dark:text-blue-400" },
  recruiter_login: { bg: "bg-gray-100 dark:bg-gray-800/60",   color: "text-gray-500 dark:text-gray-400" },
  jd_generation:   { bg: "bg-violet-50 dark:bg-violet-950/40", color: "text-violet-600 dark:text-violet-400" },
  export:          { bg: "bg-emerald-50 dark:bg-emerald-950/40", color: "text-emerald-600 dark:text-emerald-400" },
  settings_change: { bg: "bg-amber-50 dark:bg-amber-950/40",  color: "text-amber-600 dark:text-amber-400" },
  admin_action:    { bg: "bg-red-50 dark:bg-red-950/40",      color: "text-red-600 dark:text-red-400" },
};

const fallbackBadge = { bg: "bg-gray-100 dark:bg-gray-800", color: "text-gray-500 dark:text-gray-400" };

export function AuditLogTable({ entries }: AuditLogTableProps) {
  const { t } = useLanguage();
  const tbl = t.adminPages.audit.table;
  const labels = t.adminPages.audit.eventLabels;

  return (
    <div className="hr-glass-card overflow-hidden animate-fade-up">
      <div className="overflow-x-auto">
        <table className="w-full min-w-220 text-sm">
          <thead className={cn("border-b bg-gray-50 dark:bg-gray-800/50", portalDivider)}>
            <tr>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                {tbl.type}
              </th>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                {tbl.summary}
              </th>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                {tbl.actor}
              </th>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                {tbl.ip}
              </th>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                {tbl.detail}
              </th>
              <th className={cn("px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                {tbl.time}
              </th>
            </tr>
          </thead>
          <tbody className={cn("divide-y", portalDivider)}>
            {entries.map((row, i) => {
              const badge = eventBadge[row.type] ?? fallbackBadge;
              return (
                <tr
                  key={row.id}
                  className="hr-table-row transition-colors animate-fade-up"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <td className="px-4 py-3.5">
                    <span className={cn("inline-block rounded-md px-2 py-0.5 text-xs font-semibold", badge.bg, badge.color)}>
                      {labels[row.type]}
                    </span>
                  </td>
                  <td className={cn("max-w-55 px-4 py-3.5 font-medium", portalHeadingAlt)}>{row.summary}</td>
                  <td className={cn("px-4 py-3.5", portalSubtextAlt)}>{row.actor}</td>
                  <td className={cn("whitespace-nowrap px-4 py-3.5 font-mono text-xs", portalSubtextAlt)}>{row.ip}</td>
                  <td className={cn("max-w-70 px-4 py-3.5 text-xs", portalSubtextAlt)}>{row.detail}</td>
                  <td className={cn("whitespace-nowrap px-4 py-3.5 text-right text-xs", portalSubtextAlt)}>
                    {row.timeLabel}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
