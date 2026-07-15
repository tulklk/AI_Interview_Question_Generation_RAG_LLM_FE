"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Plus, BookMarked, CheckCircle2, Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, X, Check, Rocket, Undo2 } from "lucide-react";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
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
import {
  updateJobQuestion,
  deleteJobQuestion,
  addJobQuestion,
  saveJobDraft,
  reorderJobQuestions,
  publishQuestionSet,
  unpublishQuestionSet,
} from "@/features/interview/services/interview.service";
import { QuestionEditCard } from "./question-edit-card";
import { AddQuestionDialog } from "./add-question-dialog";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { useToast } from "@/shared/providers/toast-context";

// ── Sortable wrapper ──────────────────────────────────────────────────────────

interface SortableCardProps {
  q: GeneratedQuestion;
  index: number;
  sessionId: string;
  isFirst: boolean;
  isLast: boolean;
  onSave: (changes: Partial<GeneratedQuestion>) => Promise<boolean>;
  onEditingChange: (editing: boolean) => void;
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
  onSave,
  onEditingChange,
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
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        position: "relative",
        opacity: isDragging ? 0.25 : 1,
      }}
    >
      <QuestionEditCard
        question={q}
        index={index}
        sessionId={sessionId}
        isFirst={isFirst}
        isLast={isLast}
        dragHandleListeners={listeners}
        onSave={onSave}
        onEditingChange={onEditingChange}
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
  questionSetId?: string;
  publishStatus?: "DRAFT" | "PUBLISHED" | null;
  onPublishStatusChange?: (status: "DRAFT" | "PUBLISHED") => void;
  onDraftSaved?: (questionSetId: string) => void;
}

type SaveState = "idle" | "saving" | "saved" | "error";
type PublishAction = "publish" | "unpublish" | null;

const PAGE_SIZE = 5;

export function ReviewQuestionsSection({
  sessionId,
  initialQuestions,
  status,
  failureMessage,
  readOnly = false,
  questionSetId,
  publishStatus,
  onPublishStatusChange,
  onDraftSaved,
}: ReviewQuestionsSectionProps) {
  const { t } = useLanguage();
  const rp = t.reviewPage;
  const { addToast } = useToast();
  const [questions, setQuestions] = useState<GeneratedQuestion[]>(initialQuestions);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [editingIds, setEditingIds] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showNavWarning, setShowNavWarning] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [page, setPage] = useState(1);
  const [publishConfirmAction, setPublishConfirmAction] = useState<PublishAction>(null);
  const [publishing, setPublishing] = useState(false);

  const router = useRouter();
  const isEditable = status === "COMPLETED" && !readOnly;
  const bypassGuardRef = useRef(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const hasOpenEdits = isEditable && editingIds.length > 0;
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Warn browser close / hard refresh
  useEffect(() => {
    if (!hasOpenEdits) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasOpenEdits]);

  // Block browser back button and show in-app dialog
  useEffect(() => {
    if (!hasOpenEdits) return;
    bypassGuardRef.current = false;
    window.history.pushState({ __rqs_guard__: 1 }, "");

    const handler = () => {
      if (bypassGuardRef.current) return;
      window.history.pushState({ __rqs_guard__: 1 }, "");
      setShowNavWarning(true);
    };

    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [hasOpenEdits]);

  // Intercept Next.js <Link> / sidebar navigation
  useEffect(() => {
    if (!hasOpenEdits) return;

    function onLinkClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href.startsWith("/")) return;
      const targetPath = href.split("?")[0].split("#")[0];
      if (targetPath === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(href);
      setShowNavWarning(true);
    }

    document.addEventListener("click", onLinkClick, true);
    return () => document.removeEventListener("click", onLinkClick, true);
  }, [hasOpenEdits]);

  function handleLeaveAnyway() {
    bypassGuardRef.current = true;
    setShowNavWarning(false);
    if (pendingHref) {
      router.push(pendingHref);
      setPendingHref(null);
    } else {
      window.history.go(-2);
    }
  }

  function handleStayToSave() {
    setShowNavWarning(false);
    setPendingHref(null);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  // Build an order payload from questions that have real BE IDs.
  // Synthetic IDs (manual-, q-, stub-) are filtered out; their on-disk order is set by position.
  function buildReorderPayload(next: GeneratedQuestion[]) {
    return next
      .filter(
        (q) =>
          !q.id.startsWith("manual-") &&
          !q.id.startsWith("q-") &&
          !q.id.startsWith("stub-")
      )
      .map((q) => ({ id: q.id, order: next.indexOf(q) + 1 }));
  }

  function persistReorder(next: GeneratedQuestion[]) {
    if (sessionId.startsWith("local-")) return;
    const items = buildReorderPayload(next);
    if (items.length === 0) {
      console.warn("[persistReorder] no valid question IDs — reorder skipped. IDs:", next.map(q => q.id));
      return;
    }
    void reorderJobQuestions(sessionId, items);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = questions.findIndex((q) => q.id === String(active.id));
    const newIdx = questions.findIndex((q) => q.id === String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(questions, oldIdx, newIdx).map((q, i) => ({ ...q, orderIndex: i }));
    setQuestions(next);
    persistReorder(next);
  }

  async function handleSaveQuestion(id: string, changes: Partial<GeneratedQuestion>): Promise<boolean> {
    const isSynthetic = id.startsWith("manual-") || id.startsWith("q-") || id.startsWith("stub-");
    const isLocalSession = sessionId.startsWith("local-");

    if (isLocalSession || isSynthetic) {
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...changes } : q)));
      return true;
    }

    const ok = await updateJobQuestion(sessionId, id, {
      question: changes.question,
      questionType: changes.questionType,
      difficulty: changes.difficulty,
      rationale: changes.rationale ?? null,
      sampleAnswer: changes.sampleAnswer ?? null,
    });

    if (ok) {
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...changes } : q)));
      addToast("success", "Chỉnh sửa câu hỏi thành công");
    }
    return ok;
  }

  function handleEditingChange(id: string, editing: boolean) {
    setEditingIds((prev) => editing ? [...prev, id] : prev.filter((x) => x !== id));
  }

  function handleDelete(id: string) {
    setQuestions((prev) => {
      const next = prev.filter((q) => q.id !== id);
      const newTotalPages = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
      setPage((p) => Math.min(p, newTotalPages));
      return next;
    });
    if (!id.startsWith("manual-")) {
      setDeletedIds((prev) => [...prev, id]);
    }
    addToast("success", "Đã xóa câu hỏi");
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const next = [...questions];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    const ordered = next.map((q, i) => ({ ...q, orderIndex: i }));
    setQuestions(ordered);
    persistReorder(ordered);
  }

  function handleMoveDown(index: number) {
    if (index === questions.length - 1) return;
    const next = [...questions];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    const ordered = next.map((q, i) => ({ ...q, orderIndex: i }));
    setQuestions(ordered);
    persistReorder(ordered);
  }

  function handleAdd(newQ: Omit<GeneratedQuestion, "id" | "orderIndex">) {
    const question: GeneratedQuestion = {
      ...newQ,
      id: `manual-${Date.now()}`,
      orderIndex: questions.length,
      isEdited: true,
    };
    setQuestions((prev) => {
      const next = [...prev, question];
      setPage(Math.ceil(next.length / PAGE_SIZE));
      return next;
    });
    addToast("success", "Thêm câu hỏi thành công");
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

        // 3. Persist current question order
        const reorderItems = buildReorderPayload(questions);
        if (reorderItems.length > 0) {
          await reorderJobQuestions(sessionId, reorderItems);
        }

        // 5. Mark as saved draft
        const savedQuestionSetId = await saveJobDraft(sessionId);
        if (savedQuestionSetId) onDraftSaved?.(savedQuestionSetId);
      }

      setDeletedIds([]);
      setQuestions((prev) => prev.map((q) => ({ ...q, isEdited: false })));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  async function handleConfirmPublishAction() {
    if (!questionSetId || !publishConfirmAction) return;
    const action = publishConfirmAction;
    setPublishing(true);
    try {
      if (action === "publish") {
        await publishQuestionSet(questionSetId);
        onPublishStatusChange?.("PUBLISHED");
        addToast("success", rp.publishSuccess);
      } else {
        await unpublishQuestionSet(questionSetId);
        onPublishStatusChange?.("DRAFT");
        addToast("success", rp.unpublishSuccess);
      }
    } catch (err) {
      const message = err instanceof Error && err.message
        ? err.message
        : action === "publish" ? rp.publishFailed : rp.unpublishFailed;
      addToast("error", message);
    } finally {
      setPublishing(false);
      setPublishConfirmAction(null);
    }
  }

  // Status banners
  if (status === "PROCESSING" || status === "QUEUED" || status === "CONFIRMED") {
    return (
      <div className={cn(portalCard, "p-8")}>
        <AiLoadingSpinner text={rp.processingBanner} />
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
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <>
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
                "relative flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors",
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
            </>
          )}

          {questionSetId && questions.length > 0 && (
            publishStatus === "PUBLISHED" ? (
              <button
                type="button"
                onClick={() => setPublishConfirmAction("unpublish")}
                disabled={publishing}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border transition-colors disabled:opacity-60",
                  portalCard,
                  portalHeading,
                  "hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                {publishing ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
                {rp.unpublish}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPublishConfirmAction("publish")}
                disabled={publishing}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {publishing ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
                {rp.publish}
              </button>
            )
          )}
        </div>
      </div>

      <ConfirmDialog
        open={publishConfirmAction !== null}
        title={publishConfirmAction === "unpublish" ? rp.unpublishConfirmTitle : rp.publishConfirmTitle}
        message={publishConfirmAction === "unpublish" ? rp.unpublishConfirmMessage : rp.publishConfirmMessage}
        confirmLabel={publishConfirmAction === "unpublish" ? rp.unpublish : rp.publish}
        cancelLabel={rp.cancelBtn}
        variant={publishConfirmAction === "unpublish" ? "danger" : "primary"}
        loading={publishing}
        onConfirm={handleConfirmPublishAction}
        onCancel={() => setPublishConfirmAction(null)}
      />

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
                          onSave={(changes) => handleSaveQuestion(q.id, changes)}
                          onEditingChange={(editing) => handleEditingChange(q.id, editing)}
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
                        onSave={() => Promise.resolve(true)}
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

      {/* Unsaved-changes navigation warning */}
      {showNavWarning && createPortal(
        <div
          className="fixed inset-0 z-99999 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowNavWarning(false); }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNavWarning(false)} />
          <div className="relative z-10 w-full max-w-sm animate-fade-up">
            <div className="hr-glass-card overflow-hidden">
              <div className="h-0.5 bg-linear-to-r from-amber-400 via-orange-400 to-red-400" />
              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center shrink-0">
                      <AlertCircle size={18} className="text-amber-500" />
                    </div>
                    <div>
                      <h3 className={cn("text-sm font-semibold", portalHeading)}>Đang chỉnh sửa câu hỏi</h3>
                      <p className={cn("text-xs mt-0.5", portalSubtext)}>Bạn chưa lưu câu hỏi đang chỉnh sửa</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNavWarning(false)}
                    className={cn("p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0", portalSubtext)}
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 px-4 py-3 mb-5">
                  <p className={cn("text-sm leading-relaxed", portalHeading)}>
                    Bạn đang chỉnh sửa câu hỏi chưa lưu. Nhấn <strong>Ở lại</strong> để lưu, hoặc <strong>Bỏ qua</strong> để rời trang và mất thay đổi.
                  </p>
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleLeaveAnyway}
                    className={cn(
                      "flex-1 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                      portalHeading
                    )}
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="button"
                    onClick={handleStayToSave}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl shimmer-button hr-cta-btn text-white"
                  >
                    <Check size={14} />
                    Ở lại để lưu
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
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
