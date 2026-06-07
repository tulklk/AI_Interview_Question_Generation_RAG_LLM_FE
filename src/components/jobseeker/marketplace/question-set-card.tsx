"use client";

import Link from "next/link";
import { Clock, Users, Star, ChevronRight, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import type { QuestionSet } from "@/types/jobseeker";
import { Pill, getDifficultyBadgeClass } from "@/components/jobseeker/ui/pill";
import { CARD_SHADOW, ELEVATED_SHADOW } from "@/components/jobseeker/ui/constants";

interface QuestionSetCardProps {
  set: QuestionSet;
}

export function QuestionSetCard({ set }: QuestionSetCardProps) {
  const { t } = useLanguage();
  const p = t.jobseekerMarketplacePage;

  return (
    <div
      className="group bg-white rounded-xl flex flex-col gap-0 transition-all duration-200 overflow-hidden"
      style={{ boxShadow: CARD_SHADOW }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = ELEVATED_SHADOW;
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = CARD_SHADOW;
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
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
            <h3 className="text-[14px] font-[700] text-[#111827] leading-[20px] line-clamp-2">
              {set.title}
            </h3>
            <p className="text-[12px] text-[#6B7280] mt-0.5">{set.company}</p>
          </div>
          <Pill className={getDifficultyBadgeClass(set.difficulty)}>{set.difficulty}</Pill>
        </div>

        {/* Description */}
        <p className="text-[13px] text-[#6B7280] leading-[20px] line-clamp-2">
          {set.description}
        </p>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5">
          {set.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="bg-[#F5F7FB] text-[#111827] text-[11px] font-[500] px-2.5 py-1 rounded-[6px]"
            >
              {skill}
            </span>
          ))}
          {set.skills.length > 4 && (
            <span className="text-[11px] text-[#6B7280] px-1 py-1">
              +{set.skills.length - 4}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 text-[12px] text-[#6B7280]">
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
                    : "text-gray-200 fill-gray-200"
                }
              />
            ))}
            <span className="text-[12px] font-[600] text-[#111827] ml-1">{set.rating}</span>
          </div>
        )}
      </div>

      {/* CTA footer */}
      <div className="px-6 pb-5">
        <Link
          href={`/jobseeker/sets/${set.id}`}
          className="flex items-center justify-center gap-2 w-full text-[14px] font-[600] text-white bg-primary hover:bg-primary-hover active:bg-[#4B2FBF] rounded-lg h-[36px] transition-colors"
          style={{ boxShadow: "rgba(0,0,0,0.1) 0px 1px 3px 0px" }}
        >
          {p.startPractice}
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
