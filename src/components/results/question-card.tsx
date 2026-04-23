"use client";

import { useState } from "react";
import { Copy, Pencil, RefreshCw, Trash2, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Difficulty, InterviewQuestion } from "@/types/results";

const difficultyConfig: Record<Difficulty, { label: string; className: string }> = {
  Easy: { label: "Easy", className: "bg-emerald-100 text-emerald-700" },
  Medium: { label: "Medium", className: "bg-amber-100 text-amber-700" },
  Hard: { label: "Hard", className: "bg-red-100 text-red-600" },
};

interface QuestionCardProps {
  question: InterviewQuestion;
  index: number;
  defaultOpen?: boolean;
}

export function QuestionCard({ question, index, defaultOpen = false }: QuestionCardProps) {
  const [isAnswerOpen, setIsAnswerOpen] = useState(defaultOpen);
  const diff = difficultyConfig[question.difficulty];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-xs font-bold shrink-0 mt-0.5">
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span
              className={cn(
                "text-xs font-semibold px-2.5 py-0.5 rounded-full",
                diff.className
              )}
            >
              {diff.label}
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
            {isAnswerOpen ? "Hide Suggested Answer" : "Show Suggested Answer"}
          </button>

          {isAnswerOpen && (
            <div className="mt-3 rounded-xl bg-[#f5f3ff] border border-[#6c47ff]/15 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={13} className="text-[#6c47ff]" />
                <span className="text-xs font-semibold text-[#6c47ff]">
                  AI Suggested Answer
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {question.suggestedAnswer}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {[
            { icon: Copy, title: "Copy" },
            { icon: Pencil, title: "Edit" },
            { icon: RefreshCw, title: "Regenerate" },
            { icon: Trash2, title: "Delete" },
          ].map(({ icon: Icon, title }) => (
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
