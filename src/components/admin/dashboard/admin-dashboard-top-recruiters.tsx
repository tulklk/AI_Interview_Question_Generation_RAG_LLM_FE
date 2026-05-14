"use client";

import { adminDashboardTopRecruiters } from "@/data/admin";
import { useLanguage } from "@/context/language-context";

export function AdminDashboardTopRecruiters() {
  const { t } = useLanguage();
  const tr = t.adminPages.dashboard.topRecruiters;

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] animate-fade-up">
      <div className="mb-4">
        <h3 className="text-base font-bold text-[#111827]">{tr.title}</h3>
        <p className="mt-0.5 text-xs text-[#6b7280]">{tr.subtitle}</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e5e7eb]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-[#e5e7eb] bg-[#f9fafb]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  {tr.rank}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  {tr.recruiter}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  {tr.sessions}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  {tr.questions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {adminDashboardTopRecruiters.map((row, i) => (
                <tr
                  key={row.email}
                  className="transition-colors hover:bg-[#f9fafb]/80 animate-fade-up"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <td className="px-4 py-3.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#f5f3ff] text-xs font-bold text-[#6c47ff]">
                      {row.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-[#111827]">{row.name}</p>
                    <p className="text-xs text-[#9ca3af]">{row.email}</p>
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[#6b7280]">{row.sessions}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-[#111827]">
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
