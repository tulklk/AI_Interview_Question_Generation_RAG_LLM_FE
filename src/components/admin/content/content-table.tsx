"use client";

import { Eye, Trash2, FileText } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ContentSession } from "@/types/admin";
import { useLanguage } from "@/context/language-context";

interface ContentTableProps {
  sessions: ContentSession[];
}

export function ContentTable({ sessions }: ContentTableProps) {
  const { t } = useLanguage();
  const tbl = t.adminPages.content.table;
  const c = t.adminPages.content;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-fade-up">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{tbl.jobTitle}</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{tbl.recruiter}</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{tbl.role}</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{tbl.date}</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{tbl.questions}</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{tbl.exported}</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">{tbl.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sessions.map((session, i) => (
            <tr
              key={session.id}
              className="hover:bg-gray-50/50 transition-colors animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                    <FileText size={13} className="text-gray-400" />
                  </div>
                  <span className="font-medium text-gray-800">{session.jobTitle}</span>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <p className="text-sm font-medium text-gray-800">{session.recruiter}</p>
                <p className="text-xs text-gray-400">{session.recruiterEmail}</p>
              </td>
              <td className="px-4 py-3.5">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md", session.roleBg, session.roleColor)}>
                  {session.role}
                </span>
              </td>
              <td className="px-4 py-3.5 text-xs text-gray-500">{session.date}</td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#6c47ff] rounded-full"
                      style={{ width: `${(session.questionsCount / 20) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600">{session.questionsCount}</span>
                </div>
              </td>
              <td className="px-4 py-3.5">
                {session.exported ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                    {c.exportedLabel}
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                    {c.notExported}
                  </span>
                )}
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/history/${session.id}`}
                    className="p-1.5 text-gray-400 hover:text-[#6c47ff] hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                  >
                    <Eye size={14} />
                  </Link>
                  <button className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
