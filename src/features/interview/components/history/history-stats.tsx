"use client";

import { useEffect, useState } from "react";
import { FileText, Zap, BarChart3 } from "lucide-react";
import { cn } from "@/lib/cn";
import { getLocalSessions } from "@/features/interview/utils/local-history";
import { getGenerationJobs } from "@/features/interview/services/interview.service";
import type { GenerationSession } from "@/features/interview/types/generation-session";
import { useLanguage } from "@/shared/providers/language-context";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

const icons = [FileText, Zap, BarChart3];
const iconBgs = [
  "bg-blue-50 dark:bg-blue-950/40",
  "bg-violet-50 dark:bg-violet-950/40",
  "bg-emerald-50 dark:bg-emerald-950/40",
];
const iconColors = ["text-blue-500 dark:text-blue-400", "text-violet-500 dark:text-violet-400", "text-emerald-500 dark:text-emerald-400"];

export function HistoryStats() {
  const { t } = useLanguage();
  const labels = t.historyPage.statLabels;

  const [stats, setStats] = useState({ total: 0, questions: 0, thisMonth: 0 });

  useEffect(() => {
    function computeStats(sessions: GenerationSession[]) {
      const now = new Date();
      const thisMonth = sessions.filter((s) => {
        const d = new Date(s.createdAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      });
      setStats({
        total: sessions.length,
        questions: sessions.reduce((acc, s) => acc + (s.generatedQuestions?.length ?? 0), 0),
        thisMonth: thisMonth.length,
      });
    }

    const localSessions = getLocalSessions();
    const localOnly = localSessions.filter((s) => !s.backendJobId);

    getGenerationJobs()
      .then((backendSessions) => {
        const merged = [
          ...backendSessions,
          ...localOnly.map((s) => ({
            id: s.id,
            jobTitle: s.jobTitle,
            hrOwner: s.hrOwner,
            status: s.status,
            planDraft: s.planDraft,
            generatedQuestions: s.generatedQuestions,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          })),
        ] as GenerationSession[];
        computeStats(merged);
      })
      .catch(() => computeStats(localSessions.map((s) => ({
        id: s.id,
        jobTitle: s.jobTitle,
        hrOwner: s.hrOwner,
        status: s.status,
        planDraft: s.planDraft,
        generatedQuestions: s.generatedQuestions,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })) as GenerationSession[]));
  }, []);

  const values = [String(stats.total), String(stats.questions), String(stats.thisMonth)];

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
      {values.map((value, i) => {
        const Icon = icons[i];
        return (
          <div
            key={i}
            className="hr-glass-card p-3 sm:p-5 flex flex-col sm:flex-row items-center sm:items-center sm:gap-4 gap-2 animate-fade-up text-center sm:text-left"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center shrink-0 ${iconBgs[i]}`}>
              <Icon size={16} className={cn("sm:hidden", iconColors[i])} />
              <Icon size={20} className={cn("hidden sm:block", iconColors[i])} />
            </div>
            <div className="min-w-0">
              <p className={cn("text-lg sm:text-2xl font-bold leading-none", portalHeading)}>{value}</p>
              <p className={cn("text-[11px] sm:text-sm mt-0.5 sm:mt-1 leading-tight", portalSubtext)}>{labels[i]}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
