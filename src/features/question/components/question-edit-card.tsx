"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Sparkles,
  GripVertical,
  Check,
  X,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import {
  portalBanner,
  portalCard,
  portalHeading,
  portalInput,
  portalMutedBg,
  portalSubtext,
} from "@/shared/utils/portal-ui";
import type { GeneratedQuestion, DifficultyLevel, QuestionType } from "@/features/interview/types/generation-session";
import { AskAIPanel } from "./ask-ai-panel";

const QUESTION_TYPES: QuestionType[] = ["Technical", "Behavioral", "Situational", "System-design", "Problem-solving"];
const DIFFICULTIES: DifficultyLevel[] = ["Easy", "Medium", "Hard"];

const difficultyStyles: Record<DifficultyLevel, string> = {
  Easy: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  Medium: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  Hard: "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400",
};

const typeStyles: Record<QuestionType, string> = {
  Technical: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
  Behavioral: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400",
  Situational: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  "System-design": "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  "Problem-solving": "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400",
};

interface QuestionEditCardProps {
  question: GeneratedQuestion;
  index: number;
  sessionId: string;
  isFirst?: boolean;
  isLast?: boolean;
  isDragging?: boolean;
  onUpdate: (updated: Partial<GeneratedQuestion>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function QuestionEditCard({
  question,
  index,
  sessionId,
  isFirst = false,
  isLast = false,
  isDragging = false,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: QuestionEditCardProps) {
  const { t } = useLanguage();
  const rp = t.reviewPage;
  const [isAnswerOpen, setIsAnswerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAskAI, setShowAskAI] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit state
  const [editQuestion, setEditQuestion] = useState(question.question);
  const [editType, setEditType] = useState<QuestionType>(question.questionType);
  const [editDifficulty, setEditDifficulty] = useState<DifficultyLevel>(question.difficulty);
  const [editRationale, setEditRationale] = useState(question.rationale ?? "");
  const [editSampleAnswer, setEditSampleAnswer] = useState(question.sampleAnswer ?? "");

  function startEdit() {
    setEditQuestion(question.question);
    setEditType(question.questionType);
    setEditDifficulty(question.difficulty);
    setEditRationale(question.rationale ?? "");
    setEditSampleAnswer(question.sampleAnswer ?? "");
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  function saveEdit() {
    onUpdate({
      question: editQuestion,
      questionType: editType,
      difficulty: editDifficulty,
      rationale: editRationale,
      sampleAnswer: editSampleAnswer,
      isEdited: true,
    });
    setIsEditing(false);
  }

  function handleApplyAISuggestion(suggestion: string) {
    // Pre-fill edit form with AI suggestion so HR can review/adjust before saving
    setEditQuestion(suggestion);
    setEditType(question.questionType);
    setEditDifficulty(question.difficulty);
    setEditRationale(question.rationale ?? "");
    setEditSampleAnswer(question.sampleAnswer ?? "");
    setIsEditing(true);
    setShowAskAI(false);
  }

  return (
    <div className={cn(
      "rounded-xl border transition-colors",
      isDragging
        ? "border-primary/40 shadow-2xl bg-white dark:bg-gray-900"
        : isEditing
          ? "border-primary/50 shadow-sm"
          : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
    )}>
      {/* Main Card — stop pointer propagation when editing so text inputs work freely */}
      <div
        className="p-4 sm:p-5"
        onPointerDown={isEditing ? (e) => e.stopPropagation() : undefined}
      >
        <div className="flex items-start gap-3">
          {/* Drag handle + index */}
          <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
            <div className="text-gray-300 dark:text-gray-600 pointer-events-none select-none">
              <GripVertical size={14} />
            </div>
            <div className={cn("flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold", portalMutedBg, portalHeading)}>
              {index}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Badges */}
            {!isEditing && (
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", difficultyStyles[question.difficulty])}>
                  {rp.difficulty[question.difficulty]}
                </span>
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", typeStyles[question.questionType])}>
                  {rp.questionType[question.questionType]}
                </span>
                {question.isEdited && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400">
                    Edited
                  </span>
                )}
              </div>
            )}

            {/* Question text or Edit form */}
            {isEditing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={cn("text-xs font-medium mb-1 block", portalHeading)}>
                      {rp.questionFields.questionType}
                    </label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as QuestionType)}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        portalInput
                      )}
                    >
                      {QUESTION_TYPES.map((qt) => (
                        <option key={qt} value={qt}>{rp.questionType[qt]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={cn("text-xs font-medium mb-1 block", portalHeading)}>
                      {rp.questionFields.difficulty}
                    </label>
                    <select
                      value={editDifficulty}
                      onChange={(e) => setEditDifficulty(e.target.value as DifficultyLevel)}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        portalInput
                      )}
                    >
                      {DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>{rp.difficulty[d]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={cn("text-xs font-medium mb-1 block", portalHeading)}>
                    {rp.questionFields.question}
                  </label>
                  <textarea
                    value={editQuestion}
                    onChange={(e) => setEditQuestion(e.target.value)}
                    rows={3}
                    className={cn(
                      "w-full resize-none rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                      portalInput
                    )}
                  />
                </div>
                <div>
                  <label className={cn("text-xs font-medium mb-1 block", portalHeading)}>
                    {rp.questionFields.rationale}
                  </label>
                  <textarea
                    value={editRationale}
                    onChange={(e) => setEditRationale(e.target.value)}
                    rows={2}
                    className={cn(
                      "w-full resize-none rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                      portalInput
                    )}
                  />
                </div>
                <div>
                  <label className={cn("text-xs font-medium mb-1 block", portalHeading)}>
                    {rp.questionFields.sampleAnswer}
                  </label>
                  <textarea
                    value={editSampleAnswer}
                    onChange={(e) => setEditSampleAnswer(e.target.value)}
                    rows={3}
                    className={cn(
                      "w-full resize-none rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                      portalInput
                    )}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={!editQuestion.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    <Check size={13} />
                    {rp.questionActions.save}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border transition-colors",
                      portalCard,
                      portalHeading,
                      "hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    <X size={13} />
                    {rp.questionActions.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className={cn("text-sm leading-relaxed font-medium", portalHeading)}>
                  {question.question}
                </p>

                {/* Toggle answer */}
                <button
                  onClick={() => setIsAnswerOpen(!isAnswerOpen)}
                  className="flex items-center gap-1 mt-3 text-xs font-semibold text-primary hover:text-[#5535dd] transition-colors"
                >
                  {isAnswerOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  {isAnswerOpen ? "Hide Sample Answer" : "Show Sample Answer"}
                </button>

                {isAnswerOpen && (
                  <div className={cn("mt-3 rounded-lg p-4 animate-fade-up", portalBanner)}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles size={13} className="text-primary" />
                      <span className="text-xs font-semibold text-primary">
                        {t.resultsPage.questionCard.aiAnswerLabel}
                      </span>
                    </div>
                    {question.sampleAnswer && (
                      <p className={cn("text-sm leading-relaxed", portalHeading)}>
                        {question.sampleAnswer}
                      </p>
                    )}
                    {question.rationale && (
                      <p className={cn("text-xs mt-2", portalSubtext)}>
                        <strong>Rationale:</strong> {question.rationale}
                      </p>
                    )}
                    {question.citations && question.citations.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {question.citations.map((cit, i) => (
                          <p key={i} className={cn("text-xs", portalSubtext)}>
                            📎 {cit.source}
                            {cit.excerpt && ` — "${cit.excerpt}"`}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action buttons — vertical on desktop, hidden here on mobile (shown below) */}
          {!isEditing && (
            <div className="hidden sm:flex flex-col items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowAskAI(!showAskAI)}
                title={rp.questionActions.askAI}
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-lg transition-colors",
                  showAskAI
                    ? "bg-primary/10 text-primary"
                    : "text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-primary/10"
                )}
              >
                <Sparkles size={13} />
              </button>
              <button
                type="button"
                onClick={startEdit}
                title={rp.questionActions.edit}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={() => !isFirst && onMoveUp()}
                disabled={isFirst}
                title={rp.questionActions.moveUp}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronUp size={13} />
              </button>
              <button
                type="button"
                onClick={() => !isLast && onMoveDown()}
                disabled={isLast}
                title={rp.questionActions.moveDown}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronDown size={13} />
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                title={rp.questionActions.delete}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Mobile action bar — horizontal row, hidden on sm+ (handled by vertical column above) */}
        {!isEditing && (
          <div className="sm:hidden flex items-center gap-1 mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setShowAskAI(!showAskAI)}
              title={rp.questionActions.askAI}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg transition-colors",
                showAskAI
                  ? "bg-primary/10 text-primary"
                  : "text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/10"
              )}
            >
              <Sparkles size={12} />
              <span>{rp.questionActions.askAI}</span>
            </button>
            <button
              type="button"
              onClick={startEdit}
              title={rp.questionActions.edit}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Pencil size={12} />
              <span>{rp.questionActions.edit}</span>
            </button>
            <button
              type="button"
              onClick={() => !isFirst && onMoveUp()}
              disabled={isFirst}
              title={rp.questionActions.moveUp}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => !isLast && onMoveDown()}
              disabled={isLast}
              title={rp.questionActions.moveDown}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronDown size={14} />
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              title={rp.questionActions.delete}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}

        {/* Delete confirm inline */}
        {showDeleteConfirm && (
          <div className="mt-3 flex items-center justify-between rounded-lg px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 animate-fade-up">
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">
              {rp.deleteConfirm}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
              >
                {rp.cancelBtn}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); onDelete(); }}
                className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                {rp.confirmDelete}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ask AI Panel */}
      {showAskAI && (
        <AskAIPanel
          question={question}
          sessionId={sessionId}
          onApplySuggestion={handleApplyAISuggestion}
          onClose={() => setShowAskAI(false)}
        />
      )}
    </div>
  );
}
