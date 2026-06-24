"use client";

import Link from "next/link";
import { Clock, Users, Star, ChevronRight, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import type { QuestionSet } from "@/types/jobseeker";
import { Pill, getDifficultyBadgeClass } from "@/components/jobseeker/ui/pill";
import { portalHeadingAlt, portalSubtextAlt } from "@/lib/portal-ui";

interface QuestionSetCardProps {
  set: QuestionSet;
}

export function QuestionSetCard({ set }: QuestionSetCardProps) {
  const { t } = useLanguage();
  const p = t.jobseekerMarketplacePage;

  return (
    <div className="hr-glass-card group flex flex-col gap-0 overflow-hidden">
      {/* Card body */}
      <div className="p-6 flex flex-col gap-4 flex-1">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0",
              set.companyColor
            )}
          >
            {set.companyInitials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn("text-[14px] font-[700] leading-[20px] line-clamp-2", portalHeadingAlt)}>
              {set.title}
            </h3>
            <p className={cn("text-[12px] mt-0.5", portalSubtextAlt)}>{set.company}</p>
          </div>
          <Pill className={getDifficultyBadgeClass(set.difficulty)}>{set.difficulty}</Pill>
        </div>

        {/* Description */}
        <p className={cn("text-[13px] leading-[20px] line-clamp-2", portalSubtextAlt)}>
          {set.description}
        </p>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5">
          {set.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-800/30 text-[11px] font-medium px-2.5 py-1 rounded-md"
            >
              {skill}
            </span>
          ))}
          {set.skills.length > 4 && (
            <span className={cn("text-[11px] px-1 py-1", portalSubtextAlt)}>
              +{set.skills.length - 4}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className={cn("flex items-center gap-4 text-[12px]", portalSubtextAlt)}>
          <span className="flex items-center gap-1">
            <BarChart2 size={12} className="shrink-0" />
            {set.totalQuestions} {p.questions}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} className="shrink-0" />
            {p.estimatedTime}{set.estimatedTime}
          </span>
          {set.attempts !== undefined && (
            <span className="flex items-center gap-1 ml-auto">
              <Users size={12} className="shrink-0" />
              {set.attempts.toLocaleString()}
            </span>
          )}
        </div>

        {/* Rating */}
        {set.rating !== undefined && (
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={12}
                className={
                  star <= Math.round(set.rating!)
                    ? "text-amber-400 fill-amber-400"
                    : "text-gray-200 dark:text-gray-700 fill-gray-200 dark:fill-gray-700"
                }
              />
            ))}
            <span className={cn("text-[12px] font-[600] ml-1", portalHeadingAlt)}>{set.rating}</span>
          </div>
        )}
      </div>

      {/* CTA footer */}
      <div className="px-6 pb-5">
        <Link
          href={`/jobseeker/sets/${set.id}`}
          className="shimmer-button flex items-center justify-center gap-2 w-full text-[14px] font-semibold text-white hr-cta-btn rounded-lg h-9"
        >
          {p.startPractice}
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
