"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import type { SkillGap } from "@/features/candidate/data/roadmap-dummy";

const PRIORITY_CONFIG = {
  high: {
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
    label: "Ưu tiên cao",
  },
  medium: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    label: "Trung bình",
  },
  low: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
    label: "Ổn",
  },
};

interface SkillRowProps {
  skill: SkillGap;
}

function SkillRow({ skill }: SkillRowProps) {
  const cfg = PRIORITY_CONFIG[skill.priority];
  const pct = Math.min(Math.round((skill.current / skill.target) * 100), 100);
  const gap = skill.target - skill.current;

  return (
    <div className="flex flex-col gap-1.5 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("text-[13px] font-semibold truncate", portalHeadingAlt)}>
            {skill.name}
          </span>
          {skill.priority === "high" && (
            <span
              className={cn(
                "shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                cfg.bg,
                cfg.text,
              )}
            >
              {cfg.label}
            </span>
          )}
        </div>
        <span className={cn("text-[11px] tabular-nums shrink-0 font-semibold", portalSubtextAlt)}>
          {skill.current}
          <span className="opacity-50">/{skill.target}</span>
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={skill.current}
        aria-valuemin={0}
        aria-valuemax={skill.target}
        aria-label={`${skill.name}: ${skill.current}/${skill.target}`}
        className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
      >
        <div
          className={cn("h-full rounded-full transition-all duration-700", cfg.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className={cn("text-[10px]", portalSubtextAlt)}>
        Cần thêm{" "}
        <span className="font-semibold">{gap} điểm</span> để đạt mục tiêu
      </p>
    </div>
  );
}

interface SkillGapCardProps {
  skills: SkillGap[];
}

const DEFAULT_SHOW = 4;

export function SkillGapCard({ skills }: SkillGapCardProps) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...skills].sort(
    (a, b) => (a.target - a.current) - (b.target - b.current) * -1
      || b.target - b.current - (a.target - a.current),
  );
  const visible = expanded ? sorted : sorted.slice(0, DEFAULT_SHOW);

  return (
    <div className="hr-glass-card p-5 sm:p-6 mb-4">
      <div className="mb-3">
        <h2 className={cn("text-[15px] font-bold", portalHeadingAlt)}>
          Khoảng cách kỹ năng
        </h2>
        <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>
          {skills.filter((s) => s.priority === "high").length} kỹ năng cần ưu tiên
        </p>
      </div>

      <div>
        {visible.map((skill) => (
          <SkillRow key={skill.id} skill={skill} />
        ))}
      </div>

      {skills.length > DEFAULT_SHOW && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "mt-2 flex items-center gap-1 text-[11px] font-semibold transition-colors",
            "text-primary hover:text-primary-hover",
          )}
        >
          {expanded ? (
            <>
              <ChevronUp size={12} />
              Thu gọn
            </>
          ) : (
            <>
              <ChevronDown size={12} />
              Xem thêm {skills.length - DEFAULT_SHOW} kỹ năng
            </>
          )}
        </button>
      )}
    </div>
  );
}
