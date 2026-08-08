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
import { useLanguage } from "@/shared/providers/language-context";

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
  const { t } = useLanguage();
  const qb = t.questionBuilder;

  const selected = drafts.find((d) => d.questionSetId === selectedSetId) ?? null;
  const count = selected?.questionCount ?? 0;
  const progressPct = Math.min(100, Math.round((count / MIN_QUESTIONS_TO_PUBLISH) * 100));
  const readyToPublish = count >= MIN_QUESTIONS_TO_PUBLISH;

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
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-3 py-5 text-center dark:border-gray-700 dark:bg-gray-800/30">
          <Layers size={20} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className={cn(portalSubtext, "text-xs leading-relaxed")}>
            {qb.emptyDrafts}
          </p>
        </div>
      ) : (
        <ul className="max-h-56 space-y-1 overflow-y-auto">
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
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition-all",
                    active
                      ? "border-primary/40 bg-primary/5 shadow-sm"
                      : "border-transparent hover:border-gray-100 hover:bg-gray-50 dark:hover:border-gray-800 dark:hover:bg-gray-800/50"
                  )}
                >
                  <p className={cn(portalHeading, "truncate text-xs font-semibold")}>{d.title}</p>
                  <div className="mt-1 flex items-center gap-2">
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
                    <span className={cn(portalSubtext, "text-[10px]")}>DRAFT</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

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
              {count}/{MIN_QUESTIONS_TO_PUBLISH}
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
              : qb.progressNeeds.replace("{{n}}", String(MIN_QUESTIONS_TO_PUBLISH - count))}
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

      {/* Session added */}
      {sessionAdded.length > 0 ? (
        <div
          className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800"
          style={
            sessionAdded.length === 1
              ? { animation: "slideUpFade 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both" }
              : undefined
          }
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className={cn(portalHeading, "text-[11px] font-semibold")}>{qb.sessionAddedTitle}</p>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 tabular-nums dark:bg-emerald-950/50 dark:text-emerald-300">
              {sessionAdded.length}
            </span>
          </div>
          <ul className="max-h-44 space-y-1.5 overflow-y-auto">
            {sessionAdded.map((q) => (
              <li
                key={q.id}
                className="rounded-lg border border-emerald-100/80 bg-emerald-50/70 px-2.5 py-2 dark:border-emerald-900/20 dark:bg-emerald-950/20"
                style={{ animation: "scaleInFade 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}
              >
                <div className="mb-0.5 flex items-center gap-1.5">
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {q.difficulty}
                  </span>
                  {q.questionType ? (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                      {q.questionType}
                    </span>
                  ) : null}
                </div>
                <p className="line-clamp-2 text-[11px] leading-snug text-emerald-900 dark:text-emerald-200">
                  {q.question}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
