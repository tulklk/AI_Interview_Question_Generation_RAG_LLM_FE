"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, Tag } from "lucide-react";
import { cn } from "@/lib/cn";
import { demoKeywords, demoQuestions } from "@/features/guest/data/guest";
import { useLanguage } from "@/shared/providers/language-context";
import { ScrollReveal } from "@/shared/components/common/scroll-reveal";
import { CosmicField } from "@/features/guest/components/cosmic-field";
import { KEYWORD_ICONS } from "@/features/guest/components/keyword-icons";
import type { DemoQuestion } from "@/features/guest/types/guest";

type Category = "Technical" | "Behavioral" | "Situational";
const CATEGORIES: Category[] = ["Technical", "Behavioral", "Situational"];

const difficultyConfig: Record<string, { bg: string; color: string }> = {
  Easy: {
    bg: "bg-emerald-100 dark:bg-emerald-950",
    color: "text-emerald-700 dark:text-emerald-300",
  },
  Medium: {
    bg: "bg-amber-100 dark:bg-amber-950",
    color: "text-amber-700 dark:text-amber-300",
  },
  Hard: {
    bg: "bg-red-100 dark:bg-red-950",
    color: "text-red-600 dark:text-red-300",
  },
};

function QuestionCard({
  question,
  index,
  delay,
}: {
  question: DemoQuestion;
  index: number;
  delay: number;
}) {
  const { t } = useLanguage();
  const d = t.demo;
  const [open, setOpen] = useState(index === 2);
  const diff = difficultyConfig[question.difficulty];
  const qT = d.questions[question.id as keyof typeof d.questions];

  return (
    <ScrollReveal animation="fade-up" delay={delay} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-3.5 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", diff.bg, diff.color)}>
              {d.difficulty[question.difficulty]}
            </span>
            {question.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-relaxed">
            {qT?.question ?? question.question}
          </p>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 mt-3 text-xs font-semibold text-[#6c47ff] hover:text-[#5535dd] dark:hover:text-[#a78bff] transition-colors"
          >
            <ChevronDown size={13} className={cn("transition-transform", open && "rotate-180")} />
            {open ? d.hideAnswer : d.showAnswer}
          </button>
          {open && (
            <div className="mt-3 rounded-lg bg-[#f5f3ff] dark:bg-[#6c47ff]/15 border border-[#6c47ff]/15 dark:border-[#6c47ff]/25 p-4 animate-fade-up">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={12} className="text-[#6c47ff]" />
                <span className="text-xs font-semibold text-[#6c47ff]">{d.aiAnswerLabel}</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                {qT?.suggestedAnswer ?? question.suggestedAnswer}
              </p>
            </div>
          )}
        </div>
      </div>
    </ScrollReveal>
  );
}

export function DemoPreviewSection() {
  const { t } = useLanguage();
  const d = t.demo;
  const [activeTab, setActiveTab] = useState<Category>("Technical");
  const filtered = demoQuestions.filter((q) => q.category === activeTab);

  return (
    <section className="relative bg-white/92 dark:bg-gray-950/85 py-20 px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <CosmicField variant="compact" />
      </div>
      <div className="relative z-10 max-w-4xl mx-auto">
        <ScrollReveal animation="fade-up" className="text-center mb-12">
          <p className="text-sm font-semibold text-[#6c47ff] uppercase tracking-widest mb-3">
            {d.sectionLabel}
          </p>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{d.headline}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-lg mx-auto text-base leading-relaxed">
            {d.subtext}
          </p>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={80}>
          <div className="demo-mockup-3d-wrap">
          <div className="demo-mockup-3d-shadow" aria-hidden="true" />
          <div className="demo-mockup-3d">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-700 bg-[#f5f7fb] dark:bg-gray-800 px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{d.jobTitle}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{d.generatedFor}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                    Frontend
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-300">
                    Senior
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full">
                    {demoQuestions.length} {d.questionsCount}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <Tag size={12} className="text-[#6c47ff] shrink-0" />
                {demoKeywords.map((k) => {
                  const iconConfig = KEYWORD_ICONS[k];
                  const Icon = iconConfig?.icon;
                  return (
                    <span
                      key={k}
                      className="chip-pulse inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full"
                    >
                      {Icon && <Icon size={12} className={cn("shrink-0", iconConfig.className)} />}
                      {k}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 gap-1">
                {CATEGORIES.map((cat) => {
                  const count = demoQuestions.filter((q) => q.category === cat).length;
                  const isActive = activeTab === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveTab(cat)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 px-1.5 sm:px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-[#6c47ff] text-white shadow-sm"
                          : "text-gray-500 dark:text-gray-400 hover:text-[#6c47ff] dark:hover:text-[#a78bff] hover:bg-white dark:hover:bg-gray-700"
                      )}
                    >
                      {d.categories[cat]}
                      <span
                        className={cn(
                          "text-xs font-bold px-1.5 py-0.5 rounded-md",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300"
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 sm:p-4 space-y-3">
              {filtered.map((q, idx) => (
                <QuestionCard key={q.id} question={q} index={idx + 1} delay={idx * 100} />
              ))}
            </div>
          </div>
          </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
