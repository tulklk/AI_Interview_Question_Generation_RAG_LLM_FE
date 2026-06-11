"use client";

import Link from "next/link";
import { FileText, Calendar, ArrowUpDown, Eye, Download, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { historySessions } from "@/data/history";
import { useLanguage } from "@/context/language-context";
import { useHrSubscription } from "@/context/hr-subscription-context";
import {
  portalCard,
  portalDivider,
  portalHeading,
  portalIconWell,
  portalMutedBg,
  portalSubtext,
  portalTableRow,
} from "@/lib/portal-ui";

function ColumnHeader({ label }: { label: string }) {
  return (
    <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap", portalSubtext)}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={11} className="text-gray-300 dark:text-gray-600" />
      </div>
    </th>
  );
}

export function HistoryTable() {
  const { t } = useLanguage();
  const { hasFeature } = useHrSubscription();
  const ht = t.historyPage.table;
  const hs = t.hrSubscription;
  const canExport = hasFeature("pdfExport");

  return (
    <div className={cn(portalCard, "shadow-sm overflow-hidden animate-fade-up")}>
      <table className="w-full text-sm">
        <thead className={cn("border-b", portalDivider)}>
          <tr>
            <ColumnHeader label={ht.jobTitle} />
            <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{ht.role}</th>
            <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{ht.level}</th>
            <ColumnHeader label={ht.date} />
            <ColumnHeader label={ht.questions} />
            <th className={cn("px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{ht.actions}</th>
          </tr>
        </thead>
        <tbody className={cn("divide-y", portalDivider)}>
          {historySessions.map((session) => (
            <tr key={session.id} className={cn("transition-colors", portalTableRow)}>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={cn("w-7 h-7 rounded-lg border border-gray-100 dark:border-gray-700 flex items-center justify-center shrink-0", portalIconWell)}>
                    <FileText size={13} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <span className={cn("font-medium", portalHeading)}>{session.title}</span>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <span
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-md",
                    session.roleBg,
                    session.roleColor
                  )}
                >
                  {session.role}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <span
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-md",
                    session.levelBg,
                    session.levelColor
                  )}
                >
                  {session.level}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <div className={cn("flex items-center gap-1.5", portalSubtext)}>
                  <Calendar size={13} className="text-gray-300 dark:text-gray-600 shrink-0" />
                  {session.date}
                </div>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className={cn("w-20 h-1.5 rounded-full overflow-hidden", portalMutedBg)}>
                    <div
                      className="h-full bg-[#6c47ff] rounded-full"
                      style={{
                        width: `${(session.questionsCount / session.maxQuestions) * 100}%`,
                      }}
                    />
                  </div>
                  <span className={cn("text-xs font-medium", portalSubtext)}>
                    {session.questionsCount}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/hr/history/${session.id}`}
                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-[#6c47ff] hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors inline-flex"
                  >
                    <Eye size={14} />
                  </Link>
                  <button
                    type="button"
                    disabled={!canExport}
                    title={!canExport ? hs.lockedExport : undefined}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      canExport
                        ? "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        : "text-gray-200 dark:text-gray-700 cursor-not-allowed"
                    )}
                  >
                    <Download size={14} />
                  </button>
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
  );
}
