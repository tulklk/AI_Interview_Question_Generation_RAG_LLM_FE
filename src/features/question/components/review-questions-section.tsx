"use client";

import { useState } from "react";
import { Plus, BookMarked, CheckCircle2, Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import {
  portalCard,
  portalHeading,
  portalSubtext,
  portalMutedBg,
} from "@/shared/utils/portal-ui";
import type { GeneratedQuestion, GenerationStatus } from "@/features/interview/types/generation-session";
import { updateLocalSessionQuestions } from "@/features/interview/utils/local-history";
import { updateJobQuestion, deleteJobQuestion, addJobQuestion, saveJobDraft } from "@/features/interview/services/interview.service";
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

const PAGE_SIZE = 5;

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
  const [page, setPage] = useState(1);

  const isEditable = status === "COMPLETED" && !readOnly;

  function handleUpdate(id: string, changes: Partial<GeneratedQuestion>) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...changes } : q))
    );
  }

  function handleDelete(id: string) {
    setQuestions((prev) => {
      const next = prev.filter((q) => q.id !== id);
      // If deleting the last item on this page, go back one page
      const newTotalPages = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
      setPage((p) => Math.min(p, newTotalPages));
      return next;
    });
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
    setQuestions((prev) => {
      const next = [...prev, question];
      // Jump to the last page so user sees the newly added question
      setPage(Math.ceil(next.length / PAGE_SIZE));
      return next;
    });
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
      ) : (() => {
        const totalPages = Math.max(1, Math.ceil(questions.length / PAGE_SIZE));
        const safePage = Math.min(page, totalPages);
        const startIdx = (safePage - 1) * PAGE_SIZE;
        const paginated = questions.slice(startIdx, startIdx + PAGE_SIZE);

        return (
          <>
            <div className="flex flex-col gap-3">
              {paginated.map((q, idx) => {
                const globalIdx = startIdx + idx;
                return (
                  <div key={q.id} className="animate-fade-up" style={{ animationDelay: `${idx * 40}ms` }}>
                    <QuestionEditCard
                      question={q}
                      index={globalIdx + 1}
                      sessionId={sessionId}
                      isFirst={globalIdx === 0}
                      isLast={globalIdx === questions.length - 1}
                      onUpdate={(changes) => handleUpdate(q.id, changes)}
                      onDelete={() => handleDelete(q.id)}
                      onMoveUp={() => handleMoveUp(globalIdx)}
                      onMoveDown={() => handleMoveDown(globalIdx)}
                    />
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 pt-2">
                <p className={cn("text-xs", portalSubtext)}>
                  Câu {startIdx + 1}–{Math.min(safePage * PAGE_SIZE, questions.length)} / {questions.length} câu hỏi
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                    const isFirst = p === 1;
                    const isLast = p === totalPages;
                    const nearCurrent = Math.abs(p - safePage) <= 1;
                    if (!isFirst && !isLast && !nearCurrent) {
                      if (p === 2 || p === totalPages - 1) {
                        return <span key={p} className={cn("text-xs px-0.5", portalSubtext)}>…</span>;
                      }
                      return null;
                    }
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={cn(
                          "inline-flex h-8 min-w-8 px-2 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                          p === safePage
                            ? "bg-primary text-white shadow-sm"
                            : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        );
      })()}

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
