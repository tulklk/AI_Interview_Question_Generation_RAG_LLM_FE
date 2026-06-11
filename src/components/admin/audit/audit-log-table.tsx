"use client";

import type { AuditLogEntry } from "@/types/admin";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";
import { portalCard, portalDivider, portalHeadingAlt, portalSubtextAlt, portalTableRow } from "@/lib/portal-ui";

interface AuditLogTableProps {
  entries: AuditLogEntry[];
}

export function AuditLogTable({ entries }: AuditLogTableProps) {
  const { t } = useLanguage();
  const tbl = t.adminPages.audit.table;
  const labels = t.adminPages.audit.eventLabels;

  return (
    <div className={cn(portalCard, "overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-none animate-fade-up")}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
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
            {entries.map((row, i) => (
              <tr
                key={row.id}
                className={cn("transition-colors animate-fade-up", portalTableRow)}
                style={{ animationDelay: `${i * 35}ms` }}
              >
                <td className="px-4 py-3.5">
                  <span className="inline-block rounded-md bg-[#f5f3ff] dark:bg-[#6c47ff]/10 px-2 py-0.5 text-xs font-semibold text-[#6c47ff]">
                    {labels[row.type]}
                  </span>
                </td>
                <td className={cn("max-w-[220px] px-4 py-3.5 font-medium", portalHeadingAlt)}>{row.summary}</td>
                <td className={cn("px-4 py-3.5", portalSubtextAlt)}>{row.actor}</td>
                <td className={cn("whitespace-nowrap px-4 py-3.5 font-mono text-xs", portalSubtextAlt)}>{row.ip}</td>
                <td className={cn("max-w-[280px] px-4 py-3.5 text-xs", portalSubtextAlt)}>{row.detail}</td>
                <td className={cn("whitespace-nowrap px-4 py-3.5 text-right text-xs", portalSubtextAlt)}>
                  {row.timeLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
