"use client";

import { useState } from "react";
import { Plus, BookMarked, CheckCircle2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import {
  portalCard,
  portalHeading,
  portalSubtext,
  portalMutedBg,
} from "@/lib/portal-ui";
import type { GeneratedQuestion, GenerationStatus } from "@/types/generation-session";
import { updateLocalSessionQuestions } from "@/lib/local-history";
import { updateJobQuestion, deleteJobQuestion, addJobQuestion, saveJobDraft } from "@/lib/api/generation";
import { QuestionEditCard } from "./question-edit-card";
import { AddQuestionDialog } from "./add-question-dialog";

interface ReviewQuestionsSectionProps {
  sessionId: string;
  initialQuestions: GeneratedQuestion[];
  status: GenerationStatus;
  failureMessage?: string;
  readOnly?: boolean;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function ReviewQuestionsSection({
  sessionId,
  initialQuestions,
  status,
  failureMessage,
  readOnly = false,
}: ReviewQuestionsSectionProps) {
  const { t } = useLanguage();
  const rp = t.reviewPage;
  const [questions, setQuestions] = useState<GeneratedQuestion[]>(initialQuestions);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const isEditable = status === "COMPLETED" && !readOnly;

  function handleUpdate(id: string, changes: Partial<GeneratedQuestion>) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...changes } : q))
    );
  }

  function handleDelete(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    // Only track backend question IDs for deletion — manually-added ones were never saved
    if (!id.startsWith("manual-")) {
      setDeletedIds((prev) => [...prev, id]);
    }
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    setQuestions((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((q, i) => ({ ...q, orderIndex: i }));
    });
  }

  function handleMoveDown(index: number) {
    if (index === questions.length - 1) return;
    setQuestions((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((q, i) => ({ ...q, orderIndex: i }));
    });
  }

  function handleAdd(newQ: Omit<GeneratedQuestion, "id" | "orderIndex">) {
    const question: GeneratedQuestion = {
      ...newQ,
      id: `manual-${Date.now()}`,
      orderIndex: questions.length,
    };
    setQuestions((prev) => [...prev, question]);
  }

  async function handleSaveDraft() {
    setSaveState("saving");
    try {
      const isLocal = sessionId.startsWith("local-");

      if (isLocal) {
        updateLocalSessionQuestions(sessionId, questions);
      } else {
        // 1. DELETE questions removed by user (backend IDs only)
        await Promise.all(
          deletedIds.map((id) => deleteJobQuestion(sessionId, id).catch(() => {}))
        );

        // 2. POST manually-added questions (id starts with "manual-")
        const newQuestions = questions.filter((q) => q.id.startsWith("manual-"));
        await Promise.all(
          newQuestions.map((q) =>
            addJobQuestion(sessionId, {
              question: q.question,
              questionType: q.questionType,
              difficulty: q.difficulty,
              rationale: q.rationale,
              sampleAnswer: q.sampleAnswer,
              order: q.orderIndex,
            })
          )
        );

        // 3. PUT edited existing questions
        const editedQuestions = questions.filter((q) => q.isEdited && !q.id.startsWith("manual-"));
        await Promise.all(
          editedQuestions.map((q) =>
            updateJobQuestion(sessionId, q.id, {
              question: q.question,
              questionType: q.questionType,
              difficulty: q.difficulty,
              rationale: q.rationale ?? null,
              sampleAnswer: q.sampleAnswer ?? null,
            })
          )
        );

        // 4. Mark as saved draft
        await saveJobDraft(sessionId);
      }

      setDeletedIds([]);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  // Status banners
  if (status === "PROCESSING" || status === "QUEUED" || status === "CONFIRMED") {
    return (
      <div className={cn(portalCard, "p-8 flex flex-col items-center gap-4 text-center")}>
        <div className="w-12 h-12 rounded-full border-4 border-[#6c47ff] border-t-transparent animate-spin" />
        <p className={cn("text-sm font-medium", portalHeading)}>{rp.processingBanner}</p>
      </div>
    );
  }

  if (status === "FAILED") {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6 flex flex-col items-center gap-3 text-center">
        <AlertCircle size={32} className="text-red-500" />
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">{rp.failedBanner}</p>
        {failureMessage && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {rp.failedDetail.replace("{{reason}}", failureMessage)}
          </p>
        )}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:underline"
        >
          <RefreshCw size={14} />
          {t.generationSessionPage.errors.retryBtn}
        </button>
      </div>
    );
  }

  if (status !== "COMPLETED") {
    return (
      <div className={cn(portalCard, "p-6 text-center")}>
        <p className={cn("text-sm", portalSubtext)}>
          {rp.notCompletedBanner.replace("{{status}}", t.generationSessionPage.status[status])}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className={cn("text-sm", portalSubtext)}>
          {rp.questionCount.replace("{{count}}", String(questions.length))}
        </p>
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddDialog(true)}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border transition-colors",
                portalCard,
                portalHeading,
                "hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              <Plus size={14} />
              {rp.addQuestion}
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saveState === "saving"}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors",
                saveState === "saved"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  : saveState === "error"
                    ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                    : "bg-[#6c47ff] text-white hover:bg-[#5535dd] disabled:opacity-70"
              )}
            >
              {saveState === "saving" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {rp.saving}
                </>
              ) : saveState === "saved" ? (
                <>
                  <CheckCircle2 size={14} />
                  {rp.savedSuccess}
                </>
              ) : saveState === "error" ? (
                <>
                  <AlertCircle size={14} />
                  {rp.savedFailed}
                </>
              ) : (
                <>
                  <BookMarked size={14} />
                  {rp.saveDraft}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className={cn(portalCard, "p-12 flex flex-col items-center gap-3")}>
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", portalMutedBg)}>
            <BookMarked size={20} className="text-gray-400 dark:text-gray-500" />
          </div>
          <p className={cn("text-sm", portalSubtext)}>{rp.emptyState}</p>
          <button
            type="button"
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 text-sm font-semibold text-[#6c47ff] hover:underline"
          >
            <Plus size={14} />
            {rp.addQuestion}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {questions.map((q, idx) => (
            <div key={q.id} className="animate-fade-up" style={{ animationDelay: `${idx * 40}ms` }}>
              <QuestionEditCard
                question={q}
                index={idx + 1}
                sessionId={sessionId}
                isFirst={idx === 0}
                isLast={idx === questions.length - 1}
                onUpdate={(changes) => handleUpdate(q.id, changes)}
                onDelete={() => handleDelete(q.id)}
                onMoveUp={() => handleMoveUp(idx)}
                onMoveDown={() => handleMoveDown(idx)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Add Question Dialog */}
      {showAddDialog && (
        <AddQuestionDialog
          totalCount={questions.length}
          onAdd={handleAdd}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}
