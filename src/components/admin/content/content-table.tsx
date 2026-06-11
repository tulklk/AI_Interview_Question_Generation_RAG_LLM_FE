"use client";

import { Eye, Trash2, FileText } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ContentSession } from "@/types/admin";
import { useLanguage } from "@/context/language-context";
import { portalCard, portalDivider, portalHeading, portalIconWell, portalMutedBg, portalSubtext, portalTableRow } from "@/lib/portal-ui";

interface ContentTableProps {
  sessions: ContentSession[];
}

export function ContentTable({ sessions }: ContentTableProps) {
  const { t } = useLanguage();
  const tbl = t.adminPages.content.table;
  const c = t.adminPages.content;

  return (
    <div className={cn(portalCard, "overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-none animate-fade-up")}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
        <thead className={cn("border-b bg-gray-50 dark:bg-gray-800/50", portalDivider)}>
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
        <tbody className={cn("divide-y", portalDivider)}>
          {sessions.map((session, i) => (
            <tr
              key={session.id}
              className={cn("transition-colors animate-fade-up", portalTableRow)}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center shrink-0", portalIconWell, portalDivider)}>
                    <FileText size={13} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <span className={cn("font-medium", portalHeading)}>{session.jobTitle}</span>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <p className={cn("text-sm font-medium", portalHeading)}>{session.recruiter}</p>
                <p className={cn("text-xs", portalSubtext)}>{session.recruiterEmail}</p>
              </td>
              <td className="px-4 py-3.5">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md", session.roleBg, session.roleColor)}>
                  {session.role}
                </span>
              </td>
              <td className={cn("px-4 py-3.5 text-xs", portalSubtext)}>{session.date}</td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <div className={cn("w-16 h-1.5 rounded-full overflow-hidden", portalMutedBg)}>
                    <div
                      className="h-full bg-[#6c47ff] rounded-full"
                      style={{ width: `${(session.questionsCount / 20) * 100}%` }}
                    />
                  </div>
                  <span className={cn("text-xs font-medium", portalSubtext)}>{session.questionsCount}</span>
                </div>
              </td>
              <td className="px-4 py-3.5">
                {session.exported ? (
                  <span className="rounded-full bg-[#f5f3ff] dark:bg-[#6c47ff]/10 px-2 py-0.5 text-xs font-semibold text-[#6c47ff]">
                    {c.exportedLabel}
                  </span>
                ) : (
                  <span className="rounded-full bg-[#f5f7fb] dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-400 dark:text-gray-500">
                    {c.notExported}
                  </span>
                )}
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/hr/history/${session.id}`}
                    className="inline-flex rounded-lg p-1.5 text-gray-400 dark:text-gray-500 transition-colors hover:bg-[rgba(108,71,255,0.1)] hover:text-[#6c47ff]"
                  >
                    <Eye size={14} />
                  </Link>
                  <button className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
