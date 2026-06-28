"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import {
  portalCard,
  portalHeading,
  portalInput,
  portalSubtext,
} from "@/lib/portal-ui";
import type { GeneratedQuestion, QuestionType, DifficultyLevel } from "@/types/generation-session";

const QUESTION_TYPES: QuestionType[] = ["Technical", "Behavioral", "Situational", "System-design", "Problem-solving"];
const DIFFICULTIES: DifficultyLevel[] = ["Easy", "Medium", "Hard"];

interface AddQuestionDialogProps {
  totalCount: number;
  onAdd: (question: Omit<GeneratedQuestion, "id" | "orderIndex">) => void;
  onClose: () => void;
}

export function AddQuestionDialog({ totalCount, onAdd, onClose }: AddQuestionDialogProps) {
  const { t } = useLanguage();
  const d = t.reviewPage.addDialog;
  const rp = t.reviewPage;

  const [question, setQuestion] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("Technical");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("Medium");
  const [rationale, setRationale] = useState("");
  const [sampleAnswer, setSampleAnswer] = useState("");
  const [questionError, setQuestionError] = useState(false);

  function handleAdd() {
    if (!question.trim()) {
      setQuestionError(true);
      return;
    }
    onAdd({
      question: question.trim(),
      questionType,
      difficulty,
      rationale: rationale.trim() || undefined,
      sampleAnswer: sampleAnswer.trim() || undefined,
      citations: [],
    });
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-up"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={cn(
          portalCard,
          "w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-question-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 id="add-question-title" className={cn("text-base font-semibold", portalHeading)}>
            {d.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={cn("p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800", portalSubtext)}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {/* Question */}
          <div className="space-y-1.5">
            <label className={cn("text-sm font-medium", portalHeading)}>{d.questionLabel}</label>
            <textarea
              value={question}
              onChange={(e) => { setQuestion(e.target.value); setQuestionError(false); }}
              placeholder={d.questionPlaceholder}
              rows={3}
              className={cn(
                "w-full resize-none rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors",
                portalInput,
                questionError
                  ? "border-red-300 dark:border-red-700 focus:ring-red-200"
                  : "focus:ring-[#6c47ff]/20 focus:border-[#6c47ff]"
              )}
            />
            {questionError && (
              <p className="text-xs text-red-600 dark:text-red-400">{d.questionRequired}</p>
            )}
          </div>

          {/* Type + Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={cn("text-sm font-medium", portalHeading)}>{d.typeLabel}</label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                className={cn(
                  "w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors",
                  portalInput
                )}
              >
                {QUESTION_TYPES.map((qt) => (
                  <option key={qt} value={qt}>{rp.questionType[qt]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={cn("text-sm font-medium", portalHeading)}>{d.difficultyLabel}</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className={cn(
                  "w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors",
                  portalInput
                )}
              >
                {DIFFICULTIES.map((dl) => (
                  <option key={dl} value={dl}>{rp.difficulty[dl]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rationale */}
          <div className="space-y-1.5">
            <label className={cn("text-sm font-medium", portalHeading)}>{d.rationaleLabel}</label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder={d.rationalePlaceholder}
              rows={2}
              className={cn(
                "w-full resize-none rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors",
                portalInput
              )}
            />
          </div>

          {/* Sample Answer */}
          <div className="space-y-1.5">
            <label className={cn("text-sm font-medium", portalHeading)}>{d.sampleAnswerLabel}</label>
            <textarea
              value={sampleAnswer}
              onChange={(e) => setSampleAnswer(e.target.value)}
              placeholder={d.sampleAnswerPlaceholder}
              rows={3}
              className={cn(
                "w-full resize-none rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors",
                portalInput
              )}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg border transition-colors",
              portalCard,
              portalHeading,
              "hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            {d.cancelBtn}
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#6c47ff] text-white hover:bg-[#5535dd] transition-colors"
          >
            <Plus size={14} />
            {d.addBtn}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
