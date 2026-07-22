"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, TrendingDown, TrendingUp, Minus, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import type { SkillDatum } from "@/features/candidate/utils/dashboard-analytics";

type Priority = "high" | "medium" | "low";

function priorityOf(score: number): Priority {
  if (score < 50) return "high";
  if (score < 70) return "medium";
  return "low";
}

const PRIORITY_CLASS: Record<Priority, string> = {
  high: "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400",
  medium: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
  low: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
};

type SortKey = "score" | "priority";

interface WeakSkillsTableProps {
  skills: SkillDatum[];
}

export function WeakSkillsTable({ skills }: WeakSkillsTableProps) {
  const { t } = useLanguage();
  const p = t.jobseekerDashboardPage.weakSkillsTable;
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortAsc, setSortAsc] = useState(true);

  const focusSkills = useMemo(() => skills.filter((s) => s.score < 80), [skills]);

  const rows = useMemo(() => {
    const priorityRank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    const sorted = [...focusSkills].sort((a, b) => {
      if (sortKey === "score") return sortAsc ? a.score - b.score : b.score - a.score;
      const pa = priorityRank[priorityOf(a.score)];
      const pb = priorityRank[priorityOf(b.score)];
      return sortAsc ? pa - pb : pb - pa;
    });
    return sorted;
  }, [focusSkills, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  if (focusSkills.length === 0) {
    return <p className={cn("text-[13px] text-center py-6", portalSubtextAlt)}>{p.empty}</p>;
  }

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full text-left border-collapse min-w-[480px]">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className={cn("text-[11px] font-[700] uppercase tracking-wide py-2 pr-3", portalSubtextAlt)}>{p.columns.skill}</th>
            <th className="py-2 pr-3">
              <button
                type="button"
                onClick={() => toggleSort("score")}
                className={cn("flex items-center gap-1 text-[11px] font-[700] uppercase tracking-wide", portalSubtextAlt)}
              >
                {p.columns.score}
                {sortKey === "score" && (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
              </button>
            </th>
            <th className={cn("text-[11px] font-[700] uppercase tracking-wide py-2 pr-3", portalSubtextAlt)}>{p.columns.trend}</th>
            <th className="py-2 pr-3">
              <button
                type="button"
                onClick={() => toggleSort("priority")}
                className={cn("flex items-center gap-1 text-[11px] font-[700] uppercase tracking-wide", portalSubtextAlt)}
              >
                {p.columns.priority}
                {sortKey === "priority" && (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
              </button>
            </th>
            <th className={cn("text-[11px] font-[700] uppercase tracking-wide py-2", portalSubtextAlt)}>{p.columns.action}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const priority = priorityOf(s.score);
            const delta = s.previousScore !== null ? s.score - s.previousScore : null;
            const TrendIcon = delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
            const trendColor =
              delta === null || delta === 0
                ? "text-gray-400 dark:text-gray-500"
                : delta > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-500 dark:text-red-400";
            return (
              <tr key={s.skill} className="border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                <td className={cn("text-[13px] font-[600] py-3 pr-3", portalHeadingAlt)}>{s.skill}</td>
                <td className={cn("text-[13px] font-[700] tabular-nums py-3 pr-3", portalHeadingAlt)}>{s.score}%</td>
                <td className="py-3 pr-3">
                  <span className={cn("flex items-center gap-1 text-[12px] font-[600]", trendColor)}>
                    <TrendIcon size={12} />
                    {delta !== null ? `${delta > 0 ? "+" : ""}${delta}%` : "—"}
                  </span>
                </td>
                <td className="py-3 pr-3">
                  <span className={cn("text-[11px] font-[700] px-2 py-0.5 rounded-full", PRIORITY_CLASS[priority])}>
                    {p.priorityLabels[priority]}
                  </span>
                </td>
                <td className="py-3">
                  <Link
                    href="/jobseeker/practice"
                    className="inline-flex items-center gap-1 text-[12px] font-[600] text-primary hover:text-primary-hover transition-colors"
                  >
                    {p.practiceNow}
                    <ArrowUpRight size={12} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
