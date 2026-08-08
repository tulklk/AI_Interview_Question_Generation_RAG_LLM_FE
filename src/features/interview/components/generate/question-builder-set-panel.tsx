"use client";

/**
 * SCRUM-397 v3: cột trái — chọn/tạo bộ DRAFT + progress publish + câu vừa thêm.
 */
import Link from "next/link";
import { ExternalLink, Layers, Loader2, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import type { HistoryQuestionSetItem } from "@/features/hr/types/history-question-set";
import {
  portalCard,
  portalHeading,
  portalInput,
  portalSubtext,
} from "@/shared/utils/portal-ui";

export const MIN_QUESTIONS_TO_PUBLISH = 10;

export type SessionAddedQuestion = {
  id: string;
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
}: Props) {
  const selected = drafts.find((d) => d.questionSetId === selectedSetId) ?? null;
  const count = selected?.questionCount ?? 0;
  const progressPct = Math.min(100, Math.round((count / MIN_QUESTIONS_TO_PUBLISH) * 100));
  const readyToPublish = count >= MIN_QUESTIONS_TO_PUBLISH;

  return (
    <aside className={cn(portalCard, "flex flex-col p-4")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className={cn(portalHeading, "flex items-center gap-1.5 text-sm font-semibold")}>
          <Layers size={14} className="text-primary" />
          Bộ câu hỏi
        </h3>
        <button
          type="button"
          onClick={onToggleCreateForm}
          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15"
        >
          <Plus size={12} />
          Tạo mới
        </button>
      </div>

      {showCreateForm ? (
        <div className="mb-3 space-y-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
          <input
            value={newTitle}
            onChange={(e) => onNewTitleChange(e.target.value)}
            placeholder="Tên bộ (vd: Backend Mid-level)"
            className={cn(portalInput, "w-full rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-primary")}
          />
          <textarea
            value={newDescription}
            onChange={(e) => onNewDescriptionChange(e.target.value)}
            rows={2}
            placeholder="Mô tả ngắn (tuỳ chọn)"
            className={cn(portalInput, "w-full rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-primary")}
          />
          <button
            type="button"
            disabled={creatingSet}
            onClick={onCreateSet}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {creatingSet ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Tạo bộ DRAFT
          </button>
        </div>
      ) : null}

      {loadingDrafts ? (
        <div className={cn(portalSubtext, "flex items-center gap-2 py-6 text-xs")}>
          <Loader2 size={14} className="animate-spin" /> Đang tải…
        </div>
      ) : drafts.length === 0 ? (
        <p className={cn(portalSubtext, "rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-800/60")}>
          Chưa có bộ DRAFT. Tạo bộ mới ở trên để bắt đầu — không cần vào Generate trước.
        </p>
      ) : (
        <ul className="max-h-56 space-y-1.5 overflow-y-auto">
          {drafts.map((d) => {
            const active = d.questionSetId === selectedSetId;
            return (
              <li key={d.questionSetId}>
                <button
                  type="button"
                  onClick={() => onSelectSet(d.questionSetId)}
                  className={cn(
                    "w-full rounded-lg border px-2.5 py-2 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  )}
                >
                  <p className={cn(portalHeading, "truncate text-xs font-semibold")}>{d.title}</p>
                  <p className={cn(portalSubtext, "mt-0.5 text-[10px]")}>
                    {d.questionCount} câu · DRAFT
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected ? (
        <div className="mt-3 space-y-2 rounded-lg border border-gray-100 bg-gray-50/80 p-2.5 dark:border-gray-800 dark:bg-gray-800/40">
          <div className="flex items-center justify-between gap-2">
            <p className={cn(portalSubtext, "text-[10px] font-medium uppercase tracking-wide")}>
              Tiến độ publish
            </p>
            <span
              className={cn(
                "text-[11px] font-semibold tabular-nums",
                readyToPublish ? "text-emerald-600 dark:text-emerald-400" : portalSubtext
              )}
            >
              {count}/{MIN_QUESTIONS_TO_PUBLISH}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                readyToPublish ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className={cn(portalSubtext, "text-[10px]")}>
            {readyToPublish
              ? "Đủ câu để publish marketplace (mở History → Publish)."
              : `Cần thêm ${MIN_QUESTIONS_TO_PUBLISH - count} câu để publish.`}
          </p>
          <Link
            href={`/hr/history/${selected.questionSetId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            Mở bộ câu hỏi
            <ExternalLink size={12} />
          </Link>
        </div>
      ) : null}

      {sessionAdded.length > 0 ? (
        <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
          <p className={cn(portalHeading, "mb-2 text-xs font-semibold")}>Vừa thêm trong phiên</p>
          <ul className="max-h-40 space-y-1.5 overflow-y-auto">
            {sessionAdded.map((q) => (
              <li
                key={q.id}
                className="rounded-md bg-emerald-50/80 px-2 py-1.5 text-[11px] text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
              >
                <span className="font-semibold">
                  {q.difficulty}
                  {q.questionType ? ` · ${q.questionType}` : ""}
                </span>
                <span className="mt-0.5 line-clamp-2 block opacity-90">{q.question}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
