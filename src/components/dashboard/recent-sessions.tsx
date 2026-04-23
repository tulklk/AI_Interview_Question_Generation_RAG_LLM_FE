import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { recentSessions } from "@/data/dashboard";

export function RecentSessions() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Recent Sessions
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Your latest question generation sessions
          </p>
        </div>
        <Link
          href="/history"
          className="text-xs font-semibold text-[#6c47ff] hover:underline flex items-center gap-0.5"
        >
          View all <ChevronRight size={12} />
        </Link>
      </div>

      <ul className="space-y-3">
        {recentSessions.map((session, i) => (
          <li key={session.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                <FileText size={14} className="text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {session.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
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
                <span className="text-xs font-semibold text-[#6c47ff] flex items-center gap-0.5">
                  {session.questionsCount} Qs
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
