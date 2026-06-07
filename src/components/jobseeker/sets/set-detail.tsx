"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Clock, BarChart2, Users, Star, ChevronDown,
  ChevronRight, Target, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import type { QuestionSet, QuestionCategory } from "@/types/jobseeker";
import { Pill, getDifficultyBadgeClass, getCategoryBadgeClass } from "@/components/jobseeker/ui/pill";
import { CARD_SHADOW, ELEVATED_SHADOW } from "@/components/jobseeker/ui/constants";

interface SetDetailProps {
  set: QuestionSet;
}

export function SetDetail({ set }: SetDetailProps) {
  const { t } = useLanguage();
  const p = t.jobseekerSetDetailPage;

  const categories: QuestionCategory[] = ["Technical", "Behavioral", "Situational"];
  const [openCategory, setOpenCategory] = useState<QuestionCategory | null>("Technical");

  const groupedQuestions = categories.reduce((acc, cat) => {
    acc[cat] = set.questions.filter((q) => q.category === cat);
    return acc;
  }, {} as Record<QuestionCategory, typeof set.questions>);

  return (
    <div>
      {/* Back link */}
      <Link
        href="/jobseeker"
        className="inline-flex items-center gap-1.5 text-[13px] font-[500] text-[#6B7280] hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        {p.backToSets}
      </Link>

      <div className="grid grid-cols-[1fr_340px] gap-8 items-start">
        {/* ── Left content ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-6"
        >
          {/* Title block */}
          <div className="bg-white rounded-xl p-6"
            style={{ boxShadow: CARD_SHADOW }}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-bold shrink-0", set.companyColor)}>
                {set.companyInitials}
              </div>
              <div className="flex-1">
                <h1 className="text-[24px] font-[800] text-[#111827] leading-[32px]">{set.title}</h1>
                <p className="text-[14px] text-[#6B7280] mt-1">{p.by} {set.company}</p>
              </div>
              <Pill className={cn("text-[12px] px-3 py-1.5", getDifficultyBadgeClass(set.difficulty))}>
                {set.difficulty}
              </Pill>
            </div>

            <p className="text-[15px] text-[#6B7280] leading-[24px] mb-5">{set.description}</p>

            {/* Meta pills */}
            <div className="flex items-center gap-6 text-[13px] text-[#6B7280]">
              <span className="flex items-center gap-1.5">
                <BarChart2 size={14} className="text-primary" />
                {set.totalQuestions} {p.questions}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-primary" />
                {set.estimatedTime}
              </span>
              {set.attempts !== undefined && (
                <span className="flex items-center gap-1.5">
                  <Users size={14} className="text-primary" />
                  {set.attempts.toLocaleString()} {p.summaryCard.totalQuestions === "Total Questions" ? "attempts" : "lượt"}
                </span>
              )}
              {set.rating !== undefined && (
                <span className="flex items-center gap-1.5">
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                  <span className="font-[600] text-[#111827]">{set.rating}</span>
                </span>
              )}
            </div>

            {/* Skills */}
            <div className="mt-5">
              <p className="text-[12px] font-[700] text-[#111827] uppercase tracking-wide mb-3">{p.skills}</p>
              <div className="flex flex-wrap gap-2">
                {set.skills.map((s) => (
                  <span key={s} className="bg-[#F5F7FB] text-[#111827] text-[12px] font-[500] px-3 py-1.5 rounded-[6px]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Question Preview */}
          <div className="bg-white rounded-xl overflow-hidden"
            style={{ boxShadow: CARD_SHADOW }}
          >
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-[16px] font-[700] text-[#111827]">{p.preview}</h2>
            </div>

            <div className="divide-y divide-gray-100">
              {categories.map((cat) => {
                const qs = groupedQuestions[cat];
                if (qs.length === 0) return null;
                const isOpen = openCategory === cat;

                return (
                  <div key={cat}>
                    <button
                      onClick={() => setOpenCategory(isOpen ? null : cat)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Pill className={getCategoryBadgeClass(cat)}>{p.categories[cat]}</Pill>
                        <span className="text-[13px] text-[#6B7280]">{qs.length} questions</span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={cn("text-gray-400 transition-transform duration-200", isOpen && "rotate-180")}
                      />
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          {qs.map((q, idx) => (
                            <li
                              key={q.id}
                              className="flex items-start gap-4 px-6 py-4 border-t border-gray-50 bg-[#FAFAFA]"
                            >
                              <span className="text-[12px] font-[600] text-[#6B7280] w-5 shrink-0 pt-0.5">
                                {idx + 1}.
                              </span>
                              <p className="text-[14px] text-[#111827] leading-[22px] flex-1">{q.text}</p>
                              <Pill size="sm" className={getDifficultyBadgeClass(q.difficulty)}>
                                {q.difficulty}
                              </Pill>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ── Right sticky summary card ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="sticky top-6"
        >
          <div
            className="bg-white rounded-xl overflow-hidden"
            style={{ boxShadow: ELEVATED_SHADOW }}
          >
            {/* Card header */}
            <div className="bg-[#F9FAFB] px-5 py-4 border-b border-gray-100">
              <p className="text-[14px] font-[700] text-[#111827]">{p.summaryCard.title}</p>
            </div>

            {/* Stats */}
            <div className="p-5 flex flex-col gap-4">
              {[
                { label: p.summaryCard.totalQuestions, value: `${set.totalQuestions}`, icon: BarChart2 },
                { label: p.summaryCard.estimatedTime, value: set.estimatedTime, icon: Clock },
                { label: p.summaryCard.difficulty, value: set.difficulty, icon: Zap },
                { label: p.summaryCard.targetScore, value: "≥ 75 / 100", icon: Target },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[13px] text-[#6B7280]">
                    <Icon size={14} className="text-primary" />
                    {label}
                  </div>
                  <span className="text-[13px] font-[600] text-[#111827]">{value}</span>
                </div>
              ))}

              {/* Skill tags */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[11px] font-[700] text-[#111827] uppercase tracking-wide mb-2">{p.skills}</p>
                <div className="flex flex-wrap gap-1.5">
                  {set.skills.map((s) => (
                    <span key={s} className="bg-[#F5F7FB] text-[#111827] text-[11px] font-[500] px-2 py-1 rounded-[4px]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <Link
                href={`/jobseeker/practice/${set.id}`}
                className="flex items-center justify-center gap-2 w-full h-[40px] text-[14px] font-[600] text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors mt-2"
                style={{ boxShadow: "rgba(108,71,255,0.3) 0px 4px 14px 0px" }}
              >
                {p.summaryCard.startBtn}
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
