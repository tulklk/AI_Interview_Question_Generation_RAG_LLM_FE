"use client";

import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { recentSessions } from "@/data/dashboard";
import { useLanguage } from "@/context/language-context";
import { portalHeading, portalSubtext } from "@/lib/portal-ui";

export function RecentSessions() {
  const { t } = useLanguage();
  const rs = t.dashboardPage.recentSessions;

  return (
    <div className="hr-glass-card p-6 animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={cn("text-base font-semibold", portalHeading)}>{rs.title}</h3>
          <p className={cn("text-xs mt-0.5", portalSubtext)}>{rs.subtitle}</p>
        </div>
        <Link
          href="/hr/history"
          className="text-xs font-semibold text-[#7C3AED] dark:text-[#a78bff] hover:underline flex items-center gap-0.5"
        >
          {rs.viewAll} <ChevronRight size={12} />
        </Link>
      </div>

      <ul className="space-y-3">
        {recentSessions.map((session, i) => (
          <li key={session.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg hr-icon-box flex items-center justify-center shrink-0">
                <FileText size={14} className="text-[#7C3AED] dark:text-[#a78bff]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium truncate", portalHeading)}>
                  {session.title}
                </p>
                <p className={cn("text-xs mt-0.5", portalSubtext)}>
                  {session.relativeTime}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={cn(
                    "text-[11px] font-semibold px-2 py-0.5 rounded-md",
                    session.roleBg,
                    session.roleColor
                  )}
                >
                  {session.role}
                </span>
                <span className="text-xs font-semibold text-[#7C3AED] dark:text-[#a78bff] flex items-center gap-0.5">
                  {session.questionsCount} {rs.qs}
                  <ChevronRight size={12} />
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
