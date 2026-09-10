"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Clock, Globe, Loader2, Rocket, UserCheck, X } from "lucide-react";
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

  const meetsMin = selectedReadyCount >= minQuestions;

  const canConfirm =
    !saving &&
    meetsMin &&
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saving, onClose]);

  const footerReadyText = d.footerReady.replace("{{count}}", String(selectedReadyCount));
  const confirmLabel = d.confirmWithCount.replace("{{count}}", String(selectedReadyCount));

  return createPortal(
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-3 sm:p-5 bg-black/45 backdrop-blur-[6px] animate-fade-up"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={cn(
          portalCard,
          "flex w-full max-w-5xl max-h-[min(90vh,860px)] flex-col overflow-hidden shadow-xl ring-1 ring-black/5 dark:ring-white/10 animate-scale-in"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-dialog-title"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <Globe size={18} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h2
                  id="publish-dialog-title"
                  className={cn("text-lg font-semibold tracking-tight sm:text-xl", portalHeading)}
                >
                  {d.title}
                </h2>
                <p className={cn("mt-0.5 text-sm leading-snug", portalSubtext)}>
                  {d.descriptionShort}
                </p>
                <p className="mt-2 text-[11px] font-medium tabular-nums text-gray-500 dark:text-gray-400">
                  <span
                    className={cn(
                      "font-semibold",
                      meetsMin
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-amber-700 dark:text-amber-300"
                    )}
                  >
                    {selectedReadyCount}/{readyIds.length || questions.length}
                  </span>
                  {" · "}
                  {d.minLabel.replace("{{min}}", String(minQuestions))}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className={cn(
                "shrink-0 rounded-lg p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50",
                portalSubtext
              )}
              aria-label={d.cancelBtn}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.85fr)]">
          {/* Questions */}
          <div className="flex min-h-0 flex-col border-b border-gray-100 lg:border-b-0 lg:border-r dark:border-gray-800">
            <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-2.5 sm:px-5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className={cn("text-sm font-semibold", portalHeading)}>{d.questionsLabel}</p>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                    meetsMin
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  )}
                >
                  {d.selectedOnlyBadge.replace("{{selected}}", String(selectedReadyCount))}
                </span>
              </div>
              <button
                type="button"
                disabled={saving || readyIds.length === 0}
                onClick={toggleSelectAllReady}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-text-muted transition-colors hover:bg-primary/5 hover:text-primary focus-visible:text-primary focus-visible:outline-none disabled:opacity-50"
              >
                {allReadySelected ? d.deselectAll : d.selectAll}
              </button>
            </div>

            {!meetsMin && (
              <p className="shrink-0 px-4 pb-2 text-xs font-medium text-amber-700 dark:text-amber-300 sm:px-5">
                <AlertTriangle className="mr-1 inline h-3 w-3" />
                {d.minHint
                  .replace("{{min}}", String(minQuestions))
                  .replace("{{count}}", String(selectedReadyCount))}
              </p>
            )}

            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4 sm:px-4 max-h-[38vh] lg:max-h-none [scrollbar-width:thin] [scrollbar-color:rgba(156,163,175,0.35)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300/50 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600/45">
              {questions.map((q, index) => {
                const checked = selected.has(q.id);
                const stt = String(index + 1).padStart(2, "0");
                return (
                  <li key={q.id}>
                    <label
                      className={cn(
                        "group flex cursor-pointer items-start gap-2.5 rounded-xl border px-2.5 py-2 text-sm transition-colors",
                        checked
                          ? "border-emerald-200/90 border-l-[3px] border-l-emerald-500 bg-white dark:border-emerald-800/70 dark:border-l-emerald-500 dark:bg-gray-900/40"
                          : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50",
                        !q.ready &&
                          "cursor-not-allowed opacity-55 hover:bg-transparent dark:hover:bg-transparent"
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
                          "mt-0.5 inline-flex h-5 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tabular-nums",
                          checked
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        )}
                        aria-hidden
                      >
                        {stt}
                      </span>
                      <span className="flex min-w-0 flex-1 items-start gap-2">
                        <span className={cn("min-w-0 flex-1 line-clamp-2 text-[13px] font-medium leading-snug", portalHeading)}>
                          {q.preview}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold whitespace-nowrap",
                            q.ready
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
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
          </div>

          {/* Settings */}
          <div className="flex min-h-0 flex-col overflow-y-auto px-5 py-4 dark:bg-gray-950/20 sm:px-5 sm:py-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              {d.settingsTitle}
            </p>

            {/* Time */}
            <section className="space-y-2.5">
              <div className="flex items-start gap-2">
                <Clock size={14} className="mt-0.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className={cn("text-sm font-semibold", portalHeading)}>{d.timeLimitTitle}</p>
                  <p className={cn("mt-0.5 text-xs leading-snug", portalSubtext)}>
                    {d.timeLimitDescription}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setNoLimit(true);
                    setTimeError(false);
                  }}
                  className={cn(
                    "rounded-lg border px-2.5 py-2 text-left text-[11px] font-semibold transition-colors",
                    noLimit
                      ? "border-primary bg-primary/8 text-primary"
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
                    "rounded-lg border px-2.5 py-2 text-left text-[11px] font-semibold transition-colors",
                    !noLimit
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300"
                  )}
                >
                  {d.limitModeLabel}
                </button>
              </div>

              {!noLimit && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
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
                        "w-24 rounded-lg px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 transition-colors",
                        portalInput,
                        timeError
                          ? "border-red-300 dark:border-red-700 focus:ring-red-200"
                          : "focus:ring-primary/20 focus:border-primary"
                      )}
                    />
                    <span className={cn("text-xs font-medium", portalSubtext)}>
                      {d.minutesUnit}
                    </span>
                  </div>
                  {timeError && (
                    <p className="text-xs text-red-600 dark:text-red-400">{d.rangeError}</p>
                  )}
                </div>
              )}
            </section>

            <div className="my-4 border-t border-gray-100 dark:border-gray-800" />

            {/* Recommend */}
            <section className="space-y-2.5">
              <div className="flex items-start gap-2">
                <UserCheck size={14} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn("text-sm font-semibold", portalHeading)}>{d.recommendTitle}</p>
                      <p className={cn("mt-0.5 text-xs leading-snug", portalSubtext)}>
                        {d.recommendDescription}
                      </p>
                    </div>
                    <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={autoRecommendEnabled}
                        disabled={saving}
                        onChange={(e) => {
                          setAutoRecommendEnabled(e.target.checked);
                          setScoreError(false);
                        }}
                        aria-label={d.recommendEnable}
                      />
                      <span className="absolute inset-0 rounded-full bg-gray-300 transition peer-checked:bg-emerald-500 peer-disabled:opacity-50 dark:bg-gray-700" />
                      <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                    </label>
                  </div>
                  <p className={cn("mt-1.5 text-[11px] font-medium", portalHeading)}>
                    {d.recommendEnable}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  "space-y-2 transition-opacity",
                  !autoRecommendEnabled && "pointer-events-none opacity-35"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <label className={cn("text-xs font-semibold", portalHeading)}>
                    {d.recommendMinScore}
                  </label>
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
                      "w-16 rounded-lg px-2 py-1 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 disabled:opacity-50",
                      portalInput,
                      scoreError
                        ? "border-red-300 dark:border-red-700 focus:ring-red-200"
                        : "focus:ring-emerald-500/20 focus:border-emerald-500"
                    )}
                  />
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
                  <span>95</span>
                </div>
                {scoreError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{d.recommendScoreError}</p>
                )}
              </div>
              {!autoRecommendEnabled && (
                <p className={cn("text-[11px] leading-snug", portalSubtext)}>
                  {d.recommendScoreDisabledHint}
                </p>
              )}
            </section>

            {/* Compact summary */}
            <div className="mt-5 space-y-1 rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5 text-[11px] text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {d.summaryTitle}
              </p>
              <p>
                {selectedReadyCount} {d.questionsLabel.toLowerCase()}
              </p>
              <p>{noLimit ? d.noLimitLabel : `${minutes || "—"} ${d.minutesUnit}`}</p>
              <p>
                {d.recommendTitle}:{" "}
                {autoRecommendEnabled
                  ? `${d.recommendOn} · ${recommendationMinScore || "—"}`
                  : d.recommendOff}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-gray-100 bg-white px-5 py-3.5 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0 text-xs">
            {meetsMin ? (
              <p className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
                <Check size={14} strokeWidth={2.5} />
                {footerReadyText}
              </p>
            ) : (
              <p className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
                <AlertTriangle size={14} />
                {d.minHint
                  .replace("{{min}}", String(minQuestions))
                  .replace("{{count}}", String(selectedReadyCount))}
              </p>
            )}
          </div>
          <div className="flex w-full gap-2.5 sm:w-auto sm:min-w-[340px]">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className={cn(
                "flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50",
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
              className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Rocket size={15} />
              )}
              {saving ? d.publishing : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
