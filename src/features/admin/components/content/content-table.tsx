"use client";

import { Eye, Trash2, FileText } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ContentSession } from "@/features/admin/types/admin";
import { useLanguage } from "@/shared/providers/language-context";
import { portalDivider, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

const roleColorMap: Record<string, { bg: string; color: string }> = {
  Frontend: { bg: "bg-violet-50 dark:bg-violet-950/40", color: "text-violet-600 dark:text-violet-400" },
  Product:  { bg: "bg-violet-50 dark:bg-violet-950/40", color: "text-violet-600 dark:text-violet-400" },
  Design:   { bg: "bg-pink-50 dark:bg-pink-950/40",     color: "text-pink-600 dark:text-pink-400" },
  Backend:  { bg: "bg-blue-50 dark:bg-blue-950/40",     color: "text-blue-600 dark:text-blue-400" },
  DevOps:   { bg: "bg-amber-50 dark:bg-amber-950/40",   color: "text-amber-600 dark:text-amber-400" },
  Data:     { bg: "bg-emerald-50 dark:bg-emerald-950/40", color: "text-emerald-600 dark:text-emerald-400" },
  ML:       { bg: "bg-cyan-50 dark:bg-cyan-950/40",     color: "text-cyan-600 dark:text-cyan-400" },
};
const fallbackRole = { bg: "bg-gray-100 dark:bg-gray-800", color: "text-gray-500 dark:text-gray-400" };

interface ContentTableProps {
  sessions: ContentSession[];
}

export function ContentTable({ sessions }: ContentTableProps) {
  const { t } = useLanguage();
  const tbl = t.adminPages.content.table;
  const c = t.adminPages.content;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden animate-fade-up">
      <div className="overflow-x-auto">
        <table className="w-full min-w-180 text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
            <tr>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{tbl.jobTitle}</th>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{tbl.recruiter}</th>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{tbl.role}</th>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{tbl.date}</th>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{tbl.questions}</th>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{tbl.exported}</th>
              <th className={cn("px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{tbl.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {sessions.map((session, i) => {
              const rc = roleColorMap[session.role] ?? fallbackRole;
              return (
                <tr
                  key={session.id}
                  className="hr-table-row transition-colors animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-violet-50 dark:bg-violet-950/40">
                        <FileText size={13} className="text-violet-500 dark:text-violet-400" />
                      </div>
                      <span className={cn("font-medium", portalHeading)}>{session.jobTitle}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className={cn("text-sm font-medium", portalHeading)}>{session.recruiter}</p>
                    <p className={cn("text-xs", portalSubtext)}>{session.recruiterEmail}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md", rc.bg, rc.color)}>
                      {session.role}
                    </span>
                  </td>
                  <td className={cn("px-4 py-3.5 text-xs", portalSubtext)}>{session.date}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full bg-linear-to-r from-[#7C3AED] to-[#06B6D4] rounded-full"
                          style={{ width: `${(session.questionsCount / 20) * 100}%` }}
                        />
                      </div>
                      <span className={cn("text-xs font-medium", portalSubtext)}>{session.questionsCount}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {session.exported ? (
                      <span className="rounded-full bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 text-xs font-semibold text-violet-600 dark:text-violet-400">
                        {c.exportedLabel}
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-400 dark:text-gray-500">
                        {c.notExported}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/hr/history/${session.id}`}
                        className="inline-flex rounded-lg p-1.5 text-gray-400 dark:text-gray-500 transition-colors hover:bg-[rgba(124,58,237,0.1)] hover:text-[#7C3AED] dark:hover:text-[#a78bff]"
                      >
                        <Eye size={14} />
                      </Link>
                      <button
                        type="button"
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
