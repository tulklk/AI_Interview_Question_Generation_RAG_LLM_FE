"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Clock, Globe, Loader2, Rocket, UserCheck, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import {
  portalCard,
  portalHeading,
  portalInput,
  portalSubtext,
} from "@/shared/utils/portal-ui";

export type PublishDialogQuestion = {
  id: string;
  preview: string;
  ready: boolean;
  /** Default tick: ready && (defaultSelected !== false) */
  defaultSelected?: boolean;
};

export type PublishDialogConfirmPayload = {
  questionIds: string[];
  timeLimitMinutes: number | null;
  autoRecommendEnabled: boolean;
  recommendationMinScore: number;
};

interface PublishDialogProps {
  questions: PublishDialogQuestion[];
  minQuestions: number;
  currentTimeLimitMinutes?: number | null;
  initialAutoRecommendEnabled?: boolean;
  initialRecommendationMinScore?: number;
  saving?: boolean;
  onConfirm: (payload: PublishDialogConfirmPayload) => void;
  onClose: () => void;
}

/** SCRUM-439: Dialog chọn câu + time limit + ngưỡng gợi ý ứng viên trước khi publish. */
export function PublishDialog({
  questions,
  minQuestions,
  currentTimeLimitMinutes = null,
  initialAutoRecommendEnabled = true,
  initialRecommendationMinScore = 70,
  saving = false,
  onConfirm,
  onClose,
}: PublishDialogProps) {
  const { t } = useLanguage();
  const d = t.publishDialog;

  const readyIds = useMemo(
    () => questions.filter((q) => q.ready).map((q) => q.id),
    [questions]
  );

  const initialSelected = useMemo(() => {
    const set = new Set<string>();
    for (const q of questions) {
      const pick = q.defaultSelected ?? q.ready;
      if (pick && q.ready) set.add(q.id);
    }
    return set;
  }, [questions]);

  const [selected, setSelected] = useState<Set<string>>(initialSelected);
  const [noLimit, setNoLimit] = useState(currentTimeLimitMinutes == null);
  const [minutes, setMinutes] = useState(String(currentTimeLimitMinutes ?? 45));
  const [timeError, setTimeError] = useState(false);
  const [autoRecommendEnabled, setAutoRecommendEnabled] = useState(initialAutoRecommendEnabled);
  const [recommendationMinScore, setRecommendationMinScore] = useState(
    String(initialRecommendationMinScore)
  );
  const [scoreError, setScoreError] = useState(false);

  const selectedReadyCount = useMemo(() => {
    let n = 0;
    for (const q of questions) {
      if (selected.has(q.id) && q.ready) n++;
    }
    return n;
  }, [questions, selected]);

  const hasSelectedNotReady = useMemo(
    () => questions.some((q) => selected.has(q.id) && !q.ready),
    [questions, selected]
  );

  const allReadySelected =
    readyIds.length > 0 && readyIds.every((id) => selected.has(id));

  const canConfirm =
    !saving &&
    selectedReadyCount >= minQuestions &&
    !hasSelectedNotReady &&
    selected.size > 0;

  const scoreNum = Number(recommendationMinScore);
  const scorePct =
    Number.isFinite(scoreNum) && scoreNum >= 50 && scoreNum <= 95
      ? ((scoreNum - 50) / 45) * 100
      : 44; // ~70

  function toggle(id: string, ready: boolean) {
    if (!ready || saving) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllReady() {
    if (saving || readyIds.length === 0) return;
    setSelected((prev) => {
      if (readyIds.every((id) => prev.has(id))) {
        return new Set<string>();
      }
      return new Set(readyIds);
    });
  }

  function handleConfirm() {
    if (!canConfirm) return;
    let timeLimitMinutes: number | null = null;
    if (!noLimit) {
      const n = parseInt(minutes, 10);
      if (!Number.isFinite(n) || n < 1 || n > 480) {
        setTimeError(true);
        return;
      }
      timeLimitMinutes = n;
    }

    const score = parseFloat(recommendationMinScore);
    if (!Number.isFinite(score) || score < 50 || score > 95) {
      setScoreError(true);
      return;
    }

    onConfirm({
      questionIds: Array.from(selected),
      timeLimitMinutes,
      autoRecommendEnabled,
      recommendationMinScore: score,
    });
  }

  function handleClose() {
    if (saving) return;
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-3 sm:p-6 bg-black/45 backdrop-blur-[6px] animate-fade-up"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={cn(
          portalCard,
          "flex w-full max-w-5xl max-h-[min(92vh,880px)] flex-col overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10 animate-scale-in"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-dialog-title"
      >
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden border-b border-gray-100 dark:border-gray-800">
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "linear-gradient(115deg, rgba(16,185,129,0.10) 0%, rgba(108,71,255,0.08) 45%, transparent 75%)",
            }}
          />
          <div className="relative flex items-start justify-between gap-4 px-5 py-4 sm:px-7 sm:py-5">
            <div className="flex min-w-0 items-start gap-3.5">
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/25">
                <Globe size={20} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h2
                  id="publish-dialog-title"
                  className={cn("text-lg font-bold tracking-tight sm:text-xl", portalHeading)}
                >
                  {d.title}
                </h2>
                <p className={cn("mt-1 max-w-2xl text-sm leading-relaxed", portalSubtext)}>
                  {d.description}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className={cn(
                "shrink-0 rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50",
                portalSubtext
              )}
              aria-label={d.cancelBtn}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body: 2 cột trên desktop */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.9fr)]">
          {/* Cột trái — danh sách câu */}
          <div className="flex min-h-0 flex-col border-b border-gray-100 lg:border-b-0 lg:border-r dark:border-gray-800">
            <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-3 sm:px-6">
              <div className="flex items-center gap-2.5 min-w-0">
                <p className={cn("text-sm font-semibold", portalHeading)}>{d.questionsLabel}</p>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                    selectedReadyCount >= minQuestions
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  )}
                >
                  {d.selectedCount
                    .replace("{{selected}}", String(selectedReadyCount))
                    .replace("{{min}}", String(minQuestions))}
                </span>
              </div>
              <button
                type="button"
                disabled={saving || readyIds.length === 0}
                onClick={toggleSelectAllReady}
                className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#6c47ff] transition-colors hover:bg-[#6c47ff]/8 disabled:opacity-50"
              >
                {allReadySelected ? d.deselectAll : d.selectAll}
              </button>
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 sm:px-4 max-h-[42vh] lg:max-h-none">
              {questions.map((q, index) => {
                const checked = selected.has(q.id);
                const stt = index + 1;
                return (
                  <li key={q.id} className="mb-1.5">
                    <label
                      className={cn(
                        "group flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-sm transition-all",
                        checked
                          ? "bg-emerald-50/80 ring-1 ring-emerald-200/80 dark:bg-emerald-950/30 dark:ring-emerald-800/60"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/60",
                        !q.ready && "cursor-not-allowed opacity-55 hover:bg-transparent dark:hover:bg-transparent"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
                        checked={checked}
                        disabled={!q.ready || saving}
                        onChange={() => toggle(q.id, q.ready)}
                      />
                      <span
                        className={cn(
                          "mt-0.5 inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-lg px-1.5 text-[11px] font-bold tabular-nums",
                          checked
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        )}
                        aria-hidden
                      >
                        {stt}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("line-clamp-2 leading-snug", portalHeading)}>
                          {q.preview}
                        </span>
                        <span
                          className={cn(
                            "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            q.ready
                              ? "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-amber-100/80 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          )}
                        >
                          {q.ready ? (
                            <>
                              <Check size={10} strokeWidth={3} /> {d.readyBadge}
                            </>
                          ) : (
                            d.notReadyBadge
                          )}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            {selectedReadyCount < minQuestions && (
              <p className="shrink-0 px-5 pb-3 text-xs text-amber-600 dark:text-amber-400 sm:px-6">
                {d.minHint
                  .replace("{{min}}", String(minQuestions))
                  .replace("{{count}}", String(selectedReadyCount))}
              </p>
            )}
          </div>

          {/* Cột phải — cấu hình */}
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto bg-gray-50/60 px-5 py-4 dark:bg-gray-950/40 sm:px-6 sm:py-5">
            {/* Time limit */}
            <section className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#6c47ff]/10 text-[#6c47ff]">
                  <Clock size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-semibold", portalHeading)}>{d.timeLimitTitle}</p>
                  <p className={cn("mt-0.5 text-xs leading-relaxed", portalSubtext)}>
                    {d.timeLimitDescription}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setNoLimit(true);
                    setTimeError(false);
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-all",
                    noLimit
                      ? "border-[#6c47ff] bg-[#6c47ff]/8 text-[#6c47ff] ring-1 ring-[#6c47ff]/30"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300"
                  )}
                >
                  {d.noLimitLabel}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setNoLimit(false);
                    setTimeError(false);
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-all",
                    !noLimit
                      ? "border-[#6c47ff] bg-[#6c47ff]/8 text-[#6c47ff] ring-1 ring-[#6c47ff]/30"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300"
                  )}
                >
                  {d.minutesLabel}
                </button>
              </div>

              {!noLimit && (
                <div className="mt-3 space-y-1.5">
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={480}
                      value={minutes}
                      disabled={saving}
                      onChange={(e) => {
                        setMinutes(e.target.value);
                        setTimeError(false);
                      }}
                      className={cn(
                        "w-full rounded-xl px-4 py-2.5 pr-14 text-sm focus:outline-none focus:ring-2 transition-colors",
                        portalInput,
                        timeError
                          ? "border-red-300 dark:border-red-700 focus:ring-red-200"
                          : "focus:ring-[#6c47ff]/20 focus:border-[#6c47ff]"
                      )}
                    />
                    <span
                      className={cn(
                        "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium",
                        portalSubtext
                      )}
                    >
                      min
                    </span>
                  </div>
                  {timeError && (
                    <p className="text-xs text-red-600 dark:text-red-400">{d.rangeError}</p>
                  )}
                </div>
              )}
            </section>

            {/* Recommend */}
            <section className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <UserCheck size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-semibold", portalHeading)}>{d.recommendTitle}</p>
                  <p className={cn("mt-0.5 text-xs leading-relaxed", portalSubtext)}>
                    {d.recommendDescription}
                  </p>
                </div>
              </div>

              <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 py-3 dark:border-gray-800 dark:bg-gray-950/50">
                <span className={cn("text-sm font-medium", portalHeading)}>{d.recommendEnable}</span>
                <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={autoRecommendEnabled}
                    disabled={saving}
                    onChange={(e) => {
                      setAutoRecommendEnabled(e.target.checked);
                      setScoreError(false);
                    }}
                  />
                  <span className="absolute inset-0 rounded-full bg-gray-300 transition peer-checked:bg-emerald-500 peer-disabled:opacity-50 dark:bg-gray-700" />
                  <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                </span>
              </label>

              <div
                className={cn(
                  "mt-3 space-y-2 transition-opacity",
                  !autoRecommendEnabled && "opacity-45 pointer-events-none"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <label className={cn("text-xs font-semibold", portalHeading)}>
                    {d.recommendMinScore}
                  </label>
                  <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-sm font-bold tabular-nums text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    {recommendationMinScore || "—"}
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={95}
                  step={1}
                  value={
                    Number.isFinite(scoreNum) && scoreNum >= 50 && scoreNum <= 95
                      ? scoreNum
                      : 70
                  }
                  disabled={saving || !autoRecommendEnabled}
                  onChange={(e) => {
                    setRecommendationMinScore(e.target.value);
                    setScoreError(false);
                  }}
                  className="w-full accent-emerald-600"
                  style={{
                    background: `linear-gradient(to right, #10b981 ${scorePct}%, #e5e7eb ${scorePct}%)`,
                  }}
                />
                <div className="flex justify-between text-[10px] font-medium text-gray-400">
                  <span>50</span>
                  <span>70</span>
                  <span>95</span>
                </div>
                <input
                  type="number"
                  min={50}
                  max={95}
                  step={1}
                  value={recommendationMinScore}
                  disabled={saving || !autoRecommendEnabled}
                  onChange={(e) => {
                    setRecommendationMinScore(e.target.value);
                    setScoreError(false);
                  }}
                  className={cn(
                    "w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors disabled:opacity-50",
                    portalInput,
                    scoreError
                      ? "border-red-300 dark:border-red-700 focus:ring-red-200"
                      : "focus:ring-emerald-500/20 focus:border-emerald-500"
                  )}
                />
                {scoreError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{d.recommendScoreError}</p>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-100 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className={cn("hidden text-xs sm:block", portalSubtext)}>
            {selectedReadyCount}/{questions.length} · min {minQuestions}
          </p>
          <div className="flex w-full gap-3 sm:w-auto sm:min-w-[320px]">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className={cn(
                "flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-colors disabled:opacity-50",
                portalHeading,
                "hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              {d.cancelBtn}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-colors hover:bg-emerald-700 disabled:opacity-60 disabled:shadow-none"
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Rocket size={15} />
              )}
              {saving ? d.publishing : d.confirmBtn}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
