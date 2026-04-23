"use client";

import { useState } from "react";
import { Copy, Pencil, RefreshCw, Trash2, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Difficulty, InterviewQuestion } from "@/types/results";
import { useLanguage } from "@/context/language-context";

const difficultyStyles: Record<Difficulty, string> = {
  Easy: "bg-emerald-100 text-emerald-700",
  Medium: "bg-amber-100 text-amber-700",
  Hard: "bg-red-100 text-red-600",
};

interface QuestionCardProps {
  question: InterviewQuestion;
  index: number;
  defaultOpen?: boolean;
}

export function QuestionCard({ question, index, defaultOpen = false }: QuestionCardProps) {
  const { t } = useLanguage();
  const qc = t.resultsPage.questionCard;

  const [isAnswerOpen, setIsAnswerOpen] = useState(defaultOpen);
  const diffLabel = qc.difficulty[question.difficulty];
  const diffStyle = difficultyStyles[question.difficulty];

  const actions = [
    { icon: Copy, title: qc.copy },
    { icon: Pencil, title: qc.edit },
    { icon: RefreshCw, title: qc.regenerate },
    { icon: Trash2, title: qc.delete },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-xs font-bold shrink-0 mt-0.5">
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", diffStyle)}>
              {diffLabel}
            </span>
            {question.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-800 leading-relaxed font-medium">
            {question.question}
          </p>
          <button
            onClick={() => setIsAnswerOpen(!isAnswerOpen)}
            className="flex items-center gap-1 mt-3 text-xs font-semibold text-[#6c47ff] hover:text-[#5535dd] transition-colors"
          >
            {isAnswerOpen ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronRight size={13} />
            )}
            {isAnswerOpen ? qc.hideAnswer : qc.showAnswer}
          </button>

          {isAnswerOpen && (
            <div className="mt-3 rounded-lg bg-[#f5f3ff] border border-[#6c47ff]/15 p-4 animate-fade-up">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={13} className="text-[#6c47ff]" />
                <span className="text-xs font-semibold text-[#6c47ff]">
                  {qc.aiAnswerLabel}
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {question.suggestedAnswer}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {actions.map(({ icon: Icon, title }) => (
            <button
              key={title}
              title={title}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Icon size={13} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
