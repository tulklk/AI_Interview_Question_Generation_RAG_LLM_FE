"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { InterviewQuestion, QuestionCategory } from "@/types/results";
import { QuestionCard } from "./question-card";

const CATEGORIES: QuestionCategory[] = ["Technical", "Behavioral", "Situational"];

interface QuestionsTabsProps {
  questions: InterviewQuestion[];
}

export function QuestionsTabs({ questions }: QuestionsTabsProps) {
  const [activeTab, setActiveTab] = useState<QuestionCategory>("Technical");

  const countByCategory = (cat: QuestionCategory) =>
    questions.filter((q) => q.category === cat).length;

  const filtered = questions.filter((q) => q.category === activeTab);

  return (
    <div>
      <div className="flex bg-white border border-gray-200 rounded-2xl overflow-hidden mb-5">
        {CATEGORIES.map((cat, i) => {
          const count = countByCategory(cat);
          const isActive = activeTab === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors",
                i > 0 && "border-l border-gray-200",
                isActive
                  ? "bg-[#6c47ff] text-white"
                  : "text-gray-500 hover:text-[#6c47ff] hover:bg-[#6c47ff]/5"
              )}
            >
              {cat}
              <span
                className={cn(
                  "text-xs font-bold px-1.5 py-0.5 rounded-md",
                  isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-3">
        {filtered.map((question, idx) => (
          <QuestionCard
            key={`${question.category}-${question.id}`}
            question={question}
            index={idx + 1}
            defaultOpen={idx === 0}
          />
        ))}
      </div>
    </div>
  );
}
