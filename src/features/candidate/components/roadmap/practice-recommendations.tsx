"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import type { PracticeRec } from "@/features/candidate/data/roadmap-dummy";

const DIFFICULTY_STYLE: Record<
  PracticeRec["difficulty"],
  { bg: string; text: string; label: string }
> = {
  Easy:   { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", label: "Dễ" },
  Medium: { bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-600 dark:text-amber-400",    label: "TB" },
  Hard:   { bg: "bg-rose-50 dark:bg-rose-950/30",       text: "text-rose-600 dark:text-rose-400",      label: "Khó" },
};

const CATEGORY_STYLE: Record<string, { bg: string; text: string }> = {
  Technical:      { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-600 dark:text-violet-400" },
  "Problem Solving": { bg: "bg-cyan-50 dark:bg-cyan-950/30",  text: "text-cyan-600 dark:text-cyan-400"   },
  "System Design":   { bg: "bg-blue-50 dark:bg-blue-950/30",  text: "text-blue-600 dark:text-blue-400"   },
};

interface PracticeRecommendationsProps {
  practices: PracticeRec[];
}

export function PracticeRecommendations({ practices }: PracticeRecommendationsProps) {
  return (
    <div className="hr-glass-card p-5 sm:p-6 mb-6">
      <div className="mb-4">
        <h2 className={cn("text-[15px] font-bold", portalHeadingAlt)}>
          Bài luyện tập đề xuất
        </h2>
        <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>
          Được chọn lọc phù hợp với lộ trình của bạn
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {practices.map((rec, i) => {
          const diff = DIFFICULTY_STYLE[rec.difficulty];
          const cat =
            CATEGORY_STYLE[rec.category] ?? {
              bg: "bg-gray-100 dark:bg-gray-800",
              text: "text-gray-500 dark:text-gray-400",
            };

          return (
            <div
              key={rec.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-3.5 hover:border-primary/20 dark:hover:border-primary/30 transition-colors group"
            >
              {/* Index */}
              <span
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-[800] shrink-0",
                  "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
                )}
                aria-hidden="true"
              >
                {i + 1}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={cn("text-[13px] font-[700] leading-tight mb-1.5", portalHeadingAlt)}>
                  {rec.title}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                      cat.bg,
                      cat.text,
                    )}
                  >
                    {rec.category}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                      diff.bg,
                      diff.text,
                    )}
                  >
                    {diff.label}
                  </span>
                  <span className={cn("flex items-center gap-0.5 text-[10px]", portalSubtextAlt)}>
                    <Clock size={9} />
                    {rec.durationMinutes} phút
                  </span>
                </div>
              </div>

              {/* CTA */}
              <Link
                href="/candidate/practice"
                aria-label={`Luyện ngay: ${rec.title}`}
                className={cn(
                  "shrink-0 flex items-center gap-1 text-[12px] font-[700] px-3 py-1.5 rounded-lg min-h-[36px]",
                  "border border-primary/30 text-primary hover:bg-primary hover:text-white hover:border-primary",
                  "transition-colors",
                )}
              >
                Luyện ngay
                <ArrowRight size={12} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
