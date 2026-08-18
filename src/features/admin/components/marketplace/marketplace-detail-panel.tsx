"use client";

import { X, Pin, PinOff, Loader2, GlobeOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import {
  CategoryPill,
  DifficultyPill,
  formatCategoryLabel,
} from "@/features/candidate/components/ui/pill";
import type { Difficulty } from "@/features/candidate/types/jobseeker";
import type {
  AdminMarketplaceDetail,
  AdminMarketplaceQuestionSummary,
} from "@/features/admin/services/admin-marketplace.service";

interface MarketplaceDetailPanelProps {
  open: boolean;
  detail: AdminMarketplaceDetail | null;
  loading: boolean;
  error: string | null;
  pinning: boolean;
  unpublishing: boolean;
  onClose: () => void;
  onTogglePin: () => void;
  onUnpublish: () => void;
  labels: {
    title: string;
    close: string;
    hr: string;
    company: string;
    attempts: string;
    unique: string;
    rating: string;
    questions: string;
    practitioners: string;
    pin: string;
    unpin: string;
    unpublish: string;
    emptyPractitioners: string;
    retry: string;
  };
  onRetry: () => void;
}

function normalizeDifficulty(raw: string): Difficulty {
  const v = raw.trim().toLowerCase();
  if (v === "easy") return "Easy";
  if (v === "hard") return "Hard";
  return "Medium";
}

/** Card câu hỏi kiểu Candidate practice session — CategoryPill + DifficultyPill + nội dung. */
function AdminPracticeQuestionCard({
  question,
  index,
}: {
  question: AdminMarketplaceQuestionSummary;
  index: number;
}) {
  const difficulty = normalizeDifficulty(question.difficulty || "medium");
  const category = question.questionType || "technical";

  return (
    <div className="hr-glass-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[11px] font-bold tabular-nums",
            "bg-primary/10 text-primary"
          )}
        >
          {question.order || index + 1}
        </span>
        <CategoryPill category={category} label={formatCategoryLabel(category)} size="sm" />
        <DifficultyPill difficulty={difficulty} label={difficulty} size="sm" />
        {question.skill ? (
          <span className="rounded-md border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-800/30 dark:bg-violet-950/30 dark:text-violet-300">
            {question.skill}
          </span>
        ) : null}
      </div>
      <p className={cn("text-[14px] font-semibold leading-6 sm:text-[15px] sm:leading-6.5", portalHeadingAlt)}>
        {question.question}
      </p>
    </div>
  );
}

export function MarketplaceDetailPanel({
  open,
  detail,
  loading,
  error,
  pinning,
  unpublishing,
  onClose,
  onTogglePin,
  onUnpublish,
  labels,
  onRetry,
}: MarketplaceDetailPanelProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[1px]">
      <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-gray-950">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className={cn("text-base font-bold", portalHeadingAlt)}>{labels.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={labels.close}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="py-10 text-center">
              <p className={cn("mb-3 text-sm", portalSubtextAlt)}>{error}</p>
              <button type="button" onClick={onRetry} className="text-xs font-semibold text-primary hover:underline">
                {labels.retry}
              </button>
            </div>
          ) : detail ? (
            <div className="space-y-5">
              <div>
                <h3 className={cn("text-lg font-bold", portalHeadingAlt)}>{detail.title}</h3>
                {detail.description ? (
                  <p className={cn("mt-1 text-sm", portalSubtextAlt)}>{detail.description}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className={cn("text-xs", portalSubtextAlt)}>{labels.hr}</p>
                  <p className={cn("font-semibold", portalHeadingAlt)}>{detail.hrName}</p>
                  <p className={cn("text-xs", portalSubtextAlt)}>{detail.hrEmail}</p>
                </div>
                <div>
                  <p className={cn("text-xs", portalSubtextAlt)}>{labels.company}</p>
                  <p className={cn("font-semibold", portalHeadingAlt)}>{detail.companyName}</p>
                </div>
                <div>
                  <p className={cn("text-xs", portalSubtextAlt)}>{labels.attempts}</p>
                  <p className={cn("font-semibold tabular-nums", portalHeadingAlt)}>{detail.attemptCount}</p>
                </div>
                <div>
                  <p className={cn("text-xs", portalSubtextAlt)}>{labels.unique}</p>
                  <p className={cn("font-semibold tabular-nums", portalHeadingAlt)}>
                    {detail.uniqueCandidateCount}
                  </p>
                </div>
                <div>
                  <p className={cn("text-xs", portalSubtextAlt)}>{labels.rating}</p>
                  <p className={cn("font-semibold tabular-nums", portalHeadingAlt)}>
                    {detail.rating != null ? detail.rating.toFixed(1) : "—"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={pinning || unpublishing}
                  onClick={onTogglePin}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {pinning ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : detail.isPinned ? (
                    <PinOff size={14} />
                  ) : (
                    <Pin size={14} />
                  )}
                  {detail.isPinned ? labels.unpin : labels.pin}
                </button>
                <button
                  type="button"
                  disabled={unpublishing}
                  onClick={onUnpublish}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                >
                  {unpublishing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <GlobeOff size={14} />
                  )}
                  {labels.unpublish}
                </button>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className={cn("text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                    {labels.questions}
                  </p>
                  <span className={cn("text-xs font-medium tabular-nums", portalSubtextAlt)}>
                    {detail.questions.length}
                  </span>
                </div>
                {!detail.questions.length ? (
                  <p className={cn("text-sm", portalSubtextAlt)}>—</p>
                ) : (
                  <div className="flex max-h-[52vh] flex-col gap-3 overflow-y-auto pr-0.5">
                    {detail.questions.map((q, index) => (
                      <AdminPracticeQuestionCard key={q.id || `q-${index}`} question={q} index={index} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className={cn("mb-2 text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                  {labels.practitioners} ({detail.practitioners.length})
                </p>
                {!detail.practitioners.length ? (
                  <p className={cn("text-sm", portalSubtextAlt)}>{labels.emptyPractitioners}</p>
                ) : (
                  <ul className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                    {detail.practitioners.map((p) => (
                      <li key={`${p.candidateUserId}-${p.startedAt ?? ""}`} className="text-sm">
                        <p className={cn("font-semibold", portalHeadingAlt)}>{p.candidateName}</p>
                        <p className={cn("text-xs", portalSubtextAlt)}>
                          {p.candidateEmail} · {p.status}
                          {p.overallScore != null ? ` · ${p.overallScore.toFixed(0)}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
