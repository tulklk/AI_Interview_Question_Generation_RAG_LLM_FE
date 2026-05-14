"use client";

import type { AuditLogEntry } from "@/types/admin";
import { useLanguage } from "@/context/language-context";

interface AuditLogTableProps {
  entries: AuditLogEntry[];
}

export function AuditLogTable({ entries }: AuditLogTableProps) {
  const { t } = useLanguage();
  const tbl = t.adminPages.audit.table;
  const labels = t.adminPages.audit.eventLabels;

  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] animate-fade-up">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="border-b border-[#e5e7eb] bg-[#f9fafb]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                {tbl.type}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                {tbl.summary}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                {tbl.actor}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                {tbl.ip}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                {tbl.detail}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                {tbl.time}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3f4f6]">
            {entries.map((row, i) => (
              <tr
                key={row.id}
                className="transition-colors hover:bg-[#f9fafb]/80 animate-fade-up"
                style={{ animationDelay: `${i * 35}ms` }}
              >
                <td className="px-4 py-3.5">
                  <span className="inline-block rounded-md bg-[#f5f3ff] px-2 py-0.5 text-xs font-semibold text-[#6c47ff]">
                    {labels[row.type]}
                  </span>
                </td>
                <td className="max-w-[220px] px-4 py-3.5 font-medium text-[#111827]">{row.summary}</td>
                <td className="px-4 py-3.5 text-[#6b7280]">{row.actor}</td>
                <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-[#6b7280]">{row.ip}</td>
                <td className="max-w-[280px] px-4 py-3.5 text-xs text-[#6b7280]">{row.detail}</td>
                <td className="whitespace-nowrap px-4 py-3.5 text-right text-xs text-[#6b7280]">
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
