"use client";

/**
 * SCRUM-397 v3: cột trái — chọn/tạo bộ DRAFT + progress publish + câu vừa thêm.
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { Check, ExternalLink, Layers, Loader2, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import type { HistoryQuestionSetItem } from "@/features/hr/types/history-question-set";
import {
  portalCard,
  portalHeading,
  portalInput,
  portalSubtext,
} from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { DEFAULT_MIN_QUESTIONS_TO_PUBLISH } from "@/features/hr/services/hr-platform-flags.service";
import { useMinQuestionsToPublish } from "@/features/hr/hooks/use-min-questions-to-publish";

/** @deprecated Dùng useMinQuestionsToPublish() — giữ alias fallback seed = 10. */
export const MIN_QUESTIONS_TO_PUBLISH = DEFAULT_MIN_QUESTIONS_TO_PUBLISH;

export type SessionAddedQuestion = {
  id: string;
  /** Số thứ tự ổn định trong phiên, câu tạo trước là 1. */
  order: number;
  question: string;
  difficulty: string;
  questionType?: string;
};

type Props = {
  drafts: HistoryQuestionSetItem[];
  loadingDrafts: boolean;
  selectedSetId: string;
  onSelectSet: (id: string) => void;
  showCreateForm: boolean;
  onToggleCreateForm: () => void;
  newTitle: string;
  newDescription: string;
  onNewTitleChange: (v: string) => void;
  onNewDescriptionChange: (v: string) => void;
  creatingSet: boolean;
  onCreateSet: () => void;
  sessionAdded: SessionAddedQuestion[];
  editingId: string | null;
  onSelectQuestion: (id: string) => void;
  questionsLocked?: boolean;
  /** Panel thêm nhiều câu, gắn trên danh sách. */
  bulkSlot?: ReactNode;
  /** Override từ parent; mặc định đọc Admin qua hook. */
  minQuestions?: number;
};

export function QuestionBuilderSetPanel({
  drafts,
  loadingDrafts,
  selectedSetId,
  onSelectSet,
  showCreateForm,
  onToggleCreateForm,
  newTitle,
  newDescription,
  onNewTitleChange,
  onNewDescriptionChange,
  creatingSet,
  onCreateSet,
  sessionAdded,
  editingId,
  onSelectQuestion,
  questionsLocked = false,
  bulkSlot,
  minQuestions: minQuestionsProp,
}: Props) {
  const { t } = useLanguage();
  const qb = t.questionBuilder;
  const minFromAdmin = useMinQuestionsToPublish();
  const minQuestions = minQuestionsProp ?? minFromAdmin;

  const selected = drafts.find((d) => d.questionSetId === selectedSetId) ?? null;
  const count = selected?.questionCount ?? 0;
  const progressPct = Math.min(100, Math.round((count / Math.max(1, minQuestions)) * 100));
  const readyToPublish = count >= minQuestions;

  return (
    <aside className={cn(portalCard, "flex flex-col p-4")}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className={cn(portalHeading, "flex items-center gap-1.5 text-sm font-semibold")}>
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Layers size={13} className="text-primary" />
          </span>
          {qb.setPanelTitle}
        </h3>
        <button
          type="button"
          onClick={onToggleCreateForm}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
            showCreateForm
              ? "bg-primary/10 text-primary"
              : "bg-gray-100 text-gray-600 hover:bg-primary/10 hover:text-primary dark:bg-gray-800 dark:text-gray-300"
          )}
        >
          <Plus size={12} />
          {qb.createNewBtn}
        </button>
      </div>

      {/* Create form */}
      {showCreateForm ? (
        <div
          className="mb-3 space-y-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3"
          style={{ animation: "slideUpFade 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both" }}
        >
          <input
            value={newTitle}
            onChange={(e) => onNewTitleChange(e.target.value)}
            placeholder={qb.setNamePlaceholder}
            className={cn(
              portalInput,
              "w-full rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-primary"
            )}
          />
          <textarea
            value={newDescription}
            onChange={(e) => onNewDescriptionChange(e.target.value)}
            rows={2}
            placeholder={qb.setDescPlaceholder}
            className={cn(
              portalInput,
              "w-full rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-primary"
            )}
          />
          <button
            type="button"
            disabled={creatingSet}
            onClick={onCreateSet}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
          >
            {creatingSet ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {qb.createDraftBtn}
          </button>
        </div>
      ) : null}

      {/* Draft list */}
      {loadingDrafts ? (
        <div className={cn(portalSubtext, "flex items-center gap-2 py-8 text-xs")}>
          <Loader2 size={14} className="animate-spin text-primary" />
          {qb.loadingDrafts}
        </div>
      ) : drafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-3 py-6 text-center dark:border-gray-700 dark:bg-gray-800/30">
          <Layers size={22} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className={cn(portalSubtext, "text-xs leading-relaxed")}>
            {qb.emptyDrafts}
          </p>
          {!showCreateForm && (
            <button
              type="button"
              onClick={onToggleCreateForm}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-white"
            >
              <Plus size={12} />
              {qb.createDraftBtn}
            </button>
          )}
        </div>
      ) : (
        <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
          {drafts.map((d, i) => {
            const active = d.questionSetId === selectedSetId;
            return (
              <li
                key={d.questionSetId}
                style={{
                  animation: `slideUpFade 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both ${Math.min(i, 6) * 0.05}s`,
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelectSet(d.questionSetId)}
                  aria-pressed={active}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all",
                    active
                      ? "border-primary/50 bg-primary/5 shadow-sm ring-1 ring-primary/20"
                      : "border-gray-100 hover:border-primary/25 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-800/50"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                      active
                        ? "bg-primary text-white"
                        : "border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                    )}
                  >
                    {active && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn(portalHeading, "block truncate text-xs font-semibold")}>
                      {d.title}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          active
                            ? "bg-primary/10 text-primary"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        )}
                      >
                        {qb.questionCount.replace("{{n}}", String(d.questionCount))}
                      </span>
                      <span className={cn(portalSubtext, "text-[10px] font-semibold")}>DRAFT</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Danh sách câu trong phiên — bấm số là mở câu đó ở giữa */}
      <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="flex items-center justify-between gap-2">
          <p className={cn(portalHeading, "text-[11px] font-semibold")}>{qb.sessionAddedTitle}</p>
          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {sessionAdded.length}
          </span>
        </div>
        {bulkSlot}
        {sessionAdded.length === 0 ? (
          <p className={cn(portalSubtext, "px-0.5 text-[11px] leading-snug")}>{qb.sessionEmpty}</p>
        ) : (
          <ul className="max-h-80 space-y-1 overflow-y-auto pr-0.5">
            {[...sessionAdded]
              .sort((a, b) => a.order - b.order)
              .map((q) => {
                const active = q.id === editingId;
                const diffLabel =
                  qb.difficultyOptions[q.difficulty as "Easy" | "Medium" | "Hard"] ?? q.difficulty;
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => onSelectQuestion(q.id)}
                      disabled={questionsLocked}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                        active
                          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                          : "border-transparent hover:border-gray-200 hover:bg-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-800/50"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums",
                          active
                            ? "bg-primary text-white"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        )}
                      >
                        {q.order}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[11px] leading-snug text-gray-800 dark:text-gray-100">
                          {q.question}
                        </span>
                        <span className={cn(portalSubtext, "mt-0.5 block text-[10px]")}>{diffLabel}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
      </div>

      {/* Progress section */}
      {selected ? (
        <div
          className="mt-3 space-y-2.5 rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-800/40"
          style={{ animation: "scaleInFade 0.32s cubic-bezier(0.25,0.46,0.45,0.94) both" }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className={cn(portalSubtext, "text-[10px] font-medium uppercase tracking-widest")}>
              {qb.progressLabel}
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                readyToPublish
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              )}
            >
              {count}/{minQuestions}
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                readyToPublish ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <p className={cn(portalSubtext, "text-[10px] leading-snug")}>
            {readyToPublish
              ? qb.progressReady
              : qb.progressNeeds.replace("{{n}}", String(minQuestions - count))}
          </p>

          <Link
            href={`/hr/history/${selected.questionSetId}`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            {qb.openSetLink}
            <ExternalLink size={11} />
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
