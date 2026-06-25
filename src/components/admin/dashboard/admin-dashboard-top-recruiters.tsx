"use client";

import { adminDashboardTopRecruiters } from "@/data/admin";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";
import { portalDivider, portalHeadingAlt, portalSubtextAlt } from "@/lib/portal-ui";

export function AdminDashboardTopRecruiters() {
  const { t } = useLanguage();
  const tr = t.adminPages.dashboard.topRecruiters;

  return (
    <div className="hr-glass-card p-6 animate-fade-up">
      <div className="mb-4">
        <h3 className={cn("text-base font-bold", portalHeadingAlt)}>{tr.title}</h3>
        <p className={cn("mt-0.5 text-xs", portalSubtextAlt)}>{tr.subtitle}</p>
      </div>

      <div className={cn("overflow-hidden rounded-lg border", portalDivider)}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-130 text-sm">
            <thead className={cn("border-b bg-gray-50 dark:bg-gray-800/50", portalDivider)}>
              <tr>
                <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                  {tr.rank}
                </th>
                <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                  {tr.recruiter}
                </th>
                <th className={cn("px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                  {tr.sessions}
                </th>
                <th className={cn("px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                  {tr.questions}
                </th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", portalDivider)}>
              {adminDashboardTopRecruiters.map((row, i) => (
                <tr
                  key={row.email}
                  className="hr-table-row transition-colors animate-fade-up"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <td className="px-4 py-3.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(124,58,237,0.1)] dark:bg-[rgba(124,58,237,0.15)] text-xs font-bold text-[#7C3AED] dark:text-[#a78bff]">
                      {row.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className={cn("font-medium", portalHeadingAlt)}>{row.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{row.email}</p>
                  </td>
                  <td className={cn("px-4 py-3.5 text-right tabular-nums", portalSubtextAlt)}>{row.sessions}</td>
                  <td className={cn("px-4 py-3.5 text-right tabular-nums font-semibold", portalHeadingAlt)}>
                    {row.questions.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
