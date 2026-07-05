"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Plus, BookMarked, CheckCircle2, Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

// ── Sortable wrapper ──────────────────────────────────────────────────────────

interface SortableCardProps {
  q: GeneratedQuestion;
  index: number;
  sessionId: string;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (changes: Partial<GeneratedQuestion>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SortableCard({
  q,
  index,
  sessionId,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: q.id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        position: "relative",
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.25 : 1,
      }}
    >
      <QuestionEditCard
        question={q}
        index={index}
        sessionId={sessionId}
        isFirst={isFirst}
        isLast={isLast}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
    </div>
  );
}

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
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [page, setPage] = useState(1);

  const isEditable = status === "COMPLETED" && !readOnly;
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setQuestions((prev) => {
      const oldIdx = prev.findIndex((q) => q.id === active.id);
      const newIdx = prev.findIndex((q) => q.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return prev;
      return arrayMove(prev, oldIdx, newIdx).map((q, i) => ({ ...q, orderIndex: i }));
    });
  }

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
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
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
              onClick={() => saveState === "idle" && setShowSaveDialog(true)}
              disabled={saveState === "saving"}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors",
                saveState === "saved"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  : saveState === "error"
                    ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                    : "bg-primary text-white hover:bg-[#5535dd] disabled:opacity-70"
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
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={paginated.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-3">
                  {paginated.map((q, idx) => {
                    const globalIdx = startIdx + idx;
                    return (
                      <div key={q.id} className="animate-fade-up" style={{ animationDelay: `${idx * 40}ms` }}>
                        <SortableCard
                          q={q}
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
              </SortableContext>

              {/* Drag overlay — shows the card floating while dragging */}
              <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
                {activeId ? (() => {
                  const dragged = questions.find((q) => q.id === activeId);
                  if (!dragged) return null;
                  const globalIdx = questions.indexOf(dragged);
                  return (
                    <div className="shadow-2xl rounded-xl rotate-1 scale-[1.02] opacity-95">
                      <QuestionEditCard
                        question={dragged}
                        index={globalIdx + 1}
                        sessionId={sessionId}
                        isFirst={false}
                        isLast={false}
                        isDragging
                        onUpdate={() => {}}
                        onDelete={() => {}}
                        onMoveUp={() => {}}
                        onMoveDown={() => {}}
                      />
                    </div>
                  );
                })() : null}
              </DragOverlay>
            </DndContext>

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

      {/* Save Draft Confirmation Dialog — rendered via portal to escape ancestor transforms */}
      {showSaveDialog && createPortal(
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSaveDialog(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSaveDialog(false)} />

          {/* Dialog */}
          <div className="relative z-10 w-full max-w-sm animate-fade-up">
            <div className="hr-glass-card overflow-hidden">
              {/* Gradient stripe */}
              <div className="h-0.5 bg-linear-to-r from-violet-500 via-purple-500 to-cyan-500" />

              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/40 flex items-center justify-center shrink-0">
                      <BookMarked size={18} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className={cn("text-sm font-semibold", portalHeading)}>Lưu bản nháp</h3>
                      <p className={cn("text-xs mt-0.5", portalSubtext)}>Xác nhận lưu câu hỏi</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSaveDialog(false)}
                    className={cn("p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0", portalSubtext)}
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Body */}
                <div className="rounded-xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 px-4 py-3 mb-5">
                  <p className={cn("text-sm leading-relaxed", portalHeading)}>
                    Bộ câu hỏi gồm{" "}
                    <span className="font-bold text-violet-600 dark:text-violet-400">{questions.length} câu</span>{" "}
                    sẽ được lưu vào lịch sử. Bạn vẫn có thể chỉnh sửa sau.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowSaveDialog(false)}
                    className={cn(
                      "flex-1 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                      portalHeading
                    )}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowSaveDialog(false); handleSaveDraft(); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl shimmer-button hr-cta-btn text-white"
                  >
                    <BookMarked size={14} />
                    Lưu ngay
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
