"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { demoKeywords, demoQuestions } from "@/data/guest";
import { useLanguage } from "@/context/language-context";
import type { DemoQuestion } from "@/types/guest";

type Category = "Technical" | "Behavioral" | "Situational";
const CATEGORIES: Category[] = ["Technical", "Behavioral", "Situational"];

const difficultyConfig: Record<string, { bg: string; color: string }> = {
  Easy: { bg: "bg-emerald-100", color: "text-emerald-700" },
  Medium: { bg: "bg-amber-100", color: "text-amber-700" },
  Hard: { bg: "bg-red-100", color: "text-red-600" },
};

function QuestionCard({
  question,
  index,
}: {
  question: DemoQuestion;
  index: number;
}) {
  const { t } = useLanguage();
  const d = t.demo;
  const [open, setOpen] = useState(index === 1);
  const diff = difficultyConfig[question.difficulty];
  const qT = d.questions[question.id as keyof typeof d.questions];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-4">
        <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", diff.bg, diff.color)}>
              {d.difficulty[question.difficulty]}
            </span>
            {question.tags.map((tag) => (
              <span key={tag} className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm font-medium text-gray-800 leading-relaxed">
            {qT?.question ?? question.question}
          </p>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 mt-3 text-xs font-semibold text-[#6c47ff] hover:text-[#5535dd] transition-colors"
          >
            <ChevronDown size={13} className={cn("transition-transform", open && "rotate-180")} />
            {open ? d.hideAnswer : d.showAnswer}
          </button>
          {open && (
            <div className="mt-3 rounded-xl bg-[#f5f3ff] border border-[#6c47ff]/15 p-4 animate-fade-up">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={12} className="text-[#6c47ff]" />
                <span className="text-xs font-semibold text-[#6c47ff]">{d.aiAnswerLabel}</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {qT?.suggestedAnswer ?? question.suggestedAnswer}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DemoPreviewSection() {
  const { t } = useLanguage();
  const d = t.demo;
  const [activeTab, setActiveTab] = useState<Category>("Technical");
  const filtered = demoQuestions.filter((q) => q.category === activeTab);

  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 animate-fade-up">
          <p className="text-sm font-semibold text-[#6c47ff] uppercase tracking-widest mb-3">
            {d.sectionLabel}
          </p>
          <h2 className="text-3xl font-bold text-gray-900">{d.headline}</h2>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto text-base leading-relaxed">
            {d.subtext}
          </p>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="border-b border-gray-100 bg-[#f5f7fb] px-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{d.jobTitle}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{d.generatedFor}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
                    Frontend
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-50 text-violet-600">
                    Senior
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    {demoQuestions.length} {d.questionsCount}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <Tag size={12} className="text-[#6c47ff] shrink-0" />
                {demoKeywords.map((k) => (
                  <span key={k} className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                    {k}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 border-b border-gray-100">
              <div className="flex bg-gray-50 border border-gray-200 rounded-xl p-1 gap-1">
                {CATEGORIES.map((cat) => {
                  const count = demoQuestions.filter((q) => q.category === cat).length;
                  const isActive = activeTab === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveTab(cat)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-[#6c47ff] text-white shadow-sm"
                          : "text-gray-500 hover:text-[#6c47ff] hover:bg-white"
                      )}
                    >
                      {d.categories[cat]}
                      <span
                        className={cn(
                          "text-xs font-bold px-1.5 py-0.5 rounded-md",
                          isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 space-y-3">
              {filtered.map((q, idx) => (
                <QuestionCard key={q.id} question={q} index={idx + 1} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
