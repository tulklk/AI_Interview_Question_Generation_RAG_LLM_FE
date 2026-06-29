"use client";

import { useState } from "react";
import { Copy, Pencil, RefreshCw, Trash2, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Difficulty, InterviewQuestion } from "@/features/question/types/results";
import { useLanguage } from "@/shared/providers/language-context";
import { portalBanner, portalCard, portalHeading, portalMutedBg } from "@/shared/utils/portal-ui";

const difficultyStyles: Record<Difficulty, string> = {
  Easy: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  Medium: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  Hard: "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400",
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
    <div className={cn(portalCard, "shadow-sm p-5")}>
      <div className="flex items-start gap-4">
        <div className={cn("flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 mt-0.5", portalMutedBg, portalHeading)}>
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
                className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full text-gray-500 dark:text-gray-400", portalMutedBg)}
              >
                {tag}
              </span>
            ))}
          </div>
          <p className={cn("text-sm leading-relaxed font-medium", portalHeading)}>
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
            <div className={cn("mt-3 rounded-lg p-4 animate-fade-up", portalBanner)}>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={13} className="text-[#6c47ff]" />
                <span className="text-xs font-semibold text-[#6c47ff]">
                  {qc.aiAnswerLabel}
                </span>
              </div>
              <p className={cn("text-sm leading-relaxed", portalHeading)}>
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
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Icon size={13} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
