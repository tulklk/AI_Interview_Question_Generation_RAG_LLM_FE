"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle, ArrowLeft, ChevronLeft, ChevronRight,
  ExternalLink, FileText, Globe, GlobeOff, Loader2, Mail, RefreshCw, Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import {
  getDraft,
  getPractitioners,
  publishQuestionSet,
  unpublishQuestionSet,
  withAbandonedToast,
  type Practitioner,
  type PractitionerSessionStatus,
} from "@/features/interview/services/interview.service";
import type { DraftQuestionSet } from "@/features/interview/types/generation-session";
import { InviteCandidateModal } from "@/features/hr/components/recommendations/invite-candidate-modal";
import { invitePractitioner } from "@/features/hr/services/hr-talent.service";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { PublishDialog, type PublishDialogConfirmPayload } from "@/features/question/components/publish-dialog";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { useMinQuestionsToPublish } from "@/features/hr/hooks/use-min-questions-to-publish";

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-rose-500",
];

function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── Same visual tokens as hr-talent-page / question-set-history-table ──────
const iconBtn =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-200";

const thCls =
  "h-10 px-3 align-middle text-[11px] font-semibold tracking-wide text-gray-500 dark:text-gray-400";

const tdCls = "h-12 px-3 align-middle";

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) {
    return <span className={cn("tabular-nums", portalSubtext)}>—</span>;
  }
  const color =
    score >= 85
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 70
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  return (
    <span className={cn("text-[14px] font-bold tabular-nums", color)}>
      {score}
    </span>
  );
}

function StatusBadge({
  status,
  labels,
}: {
  status: PractitionerSessionStatus;
  labels: Record<string, string>;
}) {
  const styles: Record<PractitionerSessionStatus, string> = {
    IN_PROGRESS:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    COMPLETED:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    ABANDONED:
      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  const text: Record<PractitionerSessionStatus, string> = {
    IN_PROGRESS: labels.inProgress,
    COMPLETED: labels.completed,
    ABANDONED: labels.abandoned,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        styles[status],
      )}
    >
      {text[status]}
    </span>
  );
}

const PAGE_SIZE = 7;

export function PractitionersPage({ questionSetId }: { questionSetId: string }) {
  const { t, lang } = useLanguage();
  const minQuestionsToPublish = useMinQuestionsToPublish();
  const p = t.practitionersPage;
  const rp = t.reviewPage;
  const { addToast } = useToast();
  const router = useRouter();

  const [set, setSet] = useState<DraftQuestionSet | null>(null);
  const [items, setItems] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmingUnpublish, setConfirmingUnpublish] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [inviteTarget, setInviteTarget] = useState<Practitioner | null>(null);
  /** SCRUM-471: bộ Tuyển — xem thêm phiên luyện */
  const [includePractice, setIncludePractice] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const setData = await getDraft(questionSetId);
      if (!setData) {
        setError(true);
        return;
      }
      setSet(setData);
      const hiring = Boolean(setData.isHiringAssessment);
      const practitioners = await getPractitioners(questionSetId, {
        includePractice: hiring && includePractice,
      });
      setItems(practitioners);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [questionSetId, includePractice]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Reset to page 1 whenever the item list refreshes
  useEffect(() => {
    setPage(1);
  }, [items]);

  const isHiring = Boolean(set?.isHiringAssessment);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function handleUnpublish() {
    if (!set || publishing) return;
    setPublishing(true);
    try {
      const abandoned = await unpublishQuestionSet(questionSetId);
      setSet((s) => (s ? { ...s, status: "DRAFT" } : s));
      addToast("success", withAbandonedToast(rp.unpublishSuccess, abandoned, rp.unpublishAbandoned));
    } catch (err) {
      addToast("error", err instanceof Error && err.message ? err.message : rp.unpublishFailed);
    } finally {
      setPublishing(false);
      setConfirmingUnpublish(false);
    }
  }

  async function handleSelectivePublish(payload: PublishDialogConfirmPayload) {
    if (!set || publishing) return;
    setPublishing(true);
    try {
      await publishQuestionSet(questionSetId, {
        questionIds: payload.questionIds,
        timeLimitMinutes: payload.timeLimitMinutes,
        autoRecommendEnabled: payload.autoRecommendEnabled,
        recommendationMinScore: payload.recommendationMinScore,
        isHiringAssessment: payload.isHiringAssessment,
        hrAntiCheatEnabled: payload.hrAntiCheatEnabled,
      });
      setSet((s) =>
        s
          ? {
              ...s,
              status: "PUBLISHED",
              autoRecommendEnabled: payload.autoRecommendEnabled,
              recommendationMinScore: payload.recommendationMinScore,
              timeLimitMinutes: payload.timeLimitMinutes,
              isHiringAssessment: payload.isHiringAssessment,
              hrAntiCheatEnabled: payload.hrAntiCheatEnabled,
            }
          : s
      );
      addToast("success", rp.publishSuccess);
      setShowPublishDialog(false);
    } catch (err) {
      addToast("error", err instanceof Error && err.message ? err.message : rp.publishFailed);
    } finally {
      setPublishing(false);
    }
  }

  function onPublishButtonClick() {
    if (!set) return;
    if (set.status === "PUBLISHED") {
      setConfirmingUnpublish(true);
      return;
    }
    const readyN = set.questions.filter((q) => q.isReady).length;
    if (readyN < minQuestionsToPublish) {
      addToast(
        "error",
        rp.publishMinHint
          .replace("{{min}}", String(minQuestionsToPublish))
          .replace("{{count}}", String(readyN))
      );
      return;
    }
    setShowPublishDialog(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-16rem)]">
        <AiLoadingSpinner text={p.loading} />
      </div>
    );
  }

  if (error || !set) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <AlertCircle size={28} className="text-red-500" />
        <p className={cn("text-sm", portalSubtext)}>{p.loadFailed}</p>
        <button type="button" onClick={() => void fetchData()}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <RefreshCw size={13} /> {p.retryBtn}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/hr/history"
        className={cn("inline-flex items-center gap-1.5 text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors", portalSubtext)}
      >
        <ArrowLeft size={14} /> {rp.backToHistory}
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-2.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={cn("text-2xl font-bold", portalHeading)}>{set.jobTitle}</h2>
              {isHiring && (
                <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                  {t.hiringMode.hiringBadge}
                </span>
              )}
            </div>
            <p className={cn("text-sm mt-1", portalSubtext)}>
              {isHiring ? p.subtextHiring : p.subtext}
            </p>
            <p className={cn("text-xs mt-0.5 font-semibold", portalHeading)}>
              {isHiring ? p.headingHiring : p.heading}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onPublishButtonClick()}
          disabled={publishing}
          className={cn(
            "flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60",
            set.status === "PUBLISHED"
              ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800"
              : "text-white bg-emerald-600 hover:bg-emerald-700"
          )}
        >
          {publishing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : set.status === "PUBLISHED" ? (
            <GlobeOff size={14} />
          ) : (
            <Globe size={14} />
          )}
          {set.status === "PUBLISHED" ? rp.unpublish : rp.publish}
        </button>
      </div>

      {isHiring && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 dark:border-gray-800 dark:bg-gray-950/40">
          <input
            type="checkbox"
            checked={includePractice}
            onChange={(e) => setIncludePractice(e.target.checked)}
            className="mt-0.5 accent-primary"
          />
          <span>
            <span className={cn("block text-xs font-semibold", portalHeading)}>{p.showPracticeToggle}</span>
            <span className={cn("block text-[11px] mt-0.5", portalSubtext)}>{p.showPracticeHint}</span>
          </span>
        </label>
      )}

      {items.length === 0 ? (
        <div className="hr-glass-card p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl hr-icon-box flex items-center justify-center">
            <Users size={22} className="text-[#7C3AED] dark:text-[#a78bff]" />
          </div>
          <p className={cn("text-sm font-medium", portalHeading)}>
            {isHiring ? p.emptyTitleHiring : p.emptyTitle}
          </p>
          <p className={cn("text-xs", portalSubtext)}>
            {isHiring ? p.emptySubtextHiring : p.emptySubtext}
          </p>
        </div>
      ) : (
        <>
          {/* ── Table — same style as hr-talent-page ── */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950/40">
            <table className="w-full min-w-160 table-fixed text-[13px]">
              <colgroup>
                <col style={{ width: "28%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "34%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/90 dark:border-gray-800 dark:bg-gray-900/60">
                  <th scope="col" className={cn(thCls, "text-left")}>{p.candidate}</th>
                  <th scope="col" className={cn(thCls, "text-center")}>{p.score}</th>
                  <th scope="col" className={cn(thCls, "text-left")}>{p.status}</th>
                  <th scope="col" className={cn(thCls, "text-left")}>{p.completedAt}</th>
                  <th scope="col" className={cn(thCls, "text-center")}>{p.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/70">
                {paginated.map((item, rowIdx) => {
                  const initials = getInitials(item.candidateName || item.candidateEmail);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-900/40 transition-colors"
                      style={{ animation: `fadeIn 0.28s ease-out both ${rowIdx * 0.04}s` }}
                    >
                      {/* Ứng viên */}
                      <td className={cn(tdCls, "overflow-hidden")}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[11px] font-bold",
                              avatarColor(item.candidateName || item.id),
                            )}
                          >
                            {initials || "?"}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={cn("truncate font-medium leading-tight", portalHeading)}
                              title={item.candidateName || item.candidateEmail}
                            >
                              {item.candidateName || "—"}
                            </p>
                            <p className={cn("truncate text-[11px] leading-tight mt-0.5", portalSubtext)}>
                              {item.candidateEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Điểm */}
                      <td className={cn(tdCls, "text-center")}>
                        <ScoreCell score={item.score} />
                      </td>

                      {/* Trạng thái */}
                      <td className={cn(tdCls, "overflow-hidden")}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={item.status} labels={p.statusLabels} />
                          {item.isOfficialTest && (
                            <span className="inline-flex items-center rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                              {t.hiringMode.officialTestBadge}
                            </span>
                          )}
                          {isHiring && !item.isOfficialTest && item.status === "COMPLETED" && (
                            <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              {p.practiceOnlyBadge}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Hoàn thành */}
                      <td className={cn(tdCls, "overflow-hidden whitespace-nowrap", portalSubtext)}>
                        {item.completedAt
                          ? formatRelativeTime(item.completedAt, lang)
                          : item.startedAt
                            ? formatRelativeTime(item.startedAt, lang)
                            : "—"}
                      </td>

                      {/* Thao tác */}
                      <td className={tdCls}>
                        <div className="flex flex-nowrap items-center justify-center gap-0.5">
                          <Link
                            href={`/hr/candidates/${item.candidateUserId}`}
                            className={iconBtn}
                            title={p.viewDetailBtn}
                          >
                            <ExternalLink size={14} />
                          </Link>
                          {item.status === "COMPLETED" && item.sessionId ? (
                            <Link
                              href={`/hr/candidates/${item.candidateUserId}/sessions/${item.sessionId}`}
                              className={iconBtn}
                              title={p.viewAnswersBtn}
                            >
                              <FileText size={14} />
                            </Link>
                          ) : (
                            <span className="h-7 w-7" aria-hidden />
                          )}
                          {item.status === "COMPLETED" ? (
                            <button
                              type="button"
                              onClick={() => setInviteTarget(item)}
                              className={iconBtn}
                              title={p.inviteBtn}
                            >
                              <Mail size={14} />
                            </button>
                          ) : (
                            <span className="h-7 w-7" aria-hidden />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 px-1 py-1">
              <p className={cn("text-xs tabular-nums", portalSubtext)}>
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, items.length)} / {items.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                  const isFirst = pg === 1;
                  const isLast = pg === totalPages;
                  const nearCurrent = Math.abs(pg - safePage) <= 1;
                  if (!isFirst && !isLast && !nearCurrent) {
                    if (pg === 2 || pg === totalPages - 1) {
                      return (
                        <span key={pg} className={cn("text-xs px-0.5", portalSubtext)}>
                          …
                        </span>
                      );
                    }
                    return null;
                  }
                  return (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setPage(pg)}
                      className={cn(
                        "inline-flex h-7 min-w-7 px-1.5 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                        pg === safePage
                          ? "bg-primary text-white shadow-sm"
                          : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
                      )}
                    >
                      {pg}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmingUnpublish}
        title={rp.unpublishConfirmTitle}
        message={rp.unpublishConfirmMessage}
        confirmLabel={rp.unpublish}
        cancelLabel={rp.cancelBtn}
        variant="danger"
        loading={publishing}
        onConfirm={() => void handleUnpublish()}
        onCancel={() => setConfirmingUnpublish(false)}
      />

      {showPublishDialog && set && (
        <PublishDialog
          questions={set.questions.map((q) => ({
            id: q.id,
            preview: q.question,
            ready: Boolean(q.isReady),
            defaultSelected: Boolean(q.isReady && q.isActive !== false),
          }))}
          minQuestions={minQuestionsToPublish}
          currentTimeLimitMinutes={set.timeLimitMinutes ?? null}
          initialAutoRecommendEnabled={set.autoRecommendEnabled ?? true}
          initialRecommendationMinScore={set.recommendationMinScore ?? 70}
          initialIsHiringAssessment={set.isHiringAssessment ?? false}
          initialHrAntiCheatEnabled={set.hrAntiCheatEnabled ?? false}
          saving={publishing}
          onConfirm={(payload) => void handleSelectivePublish(payload)}
          onClose={() => {
            if (!publishing) setShowPublishDialog(false);
          }}
        />
      )}

      {inviteTarget && (
        <InviteCandidateModal
          target={{
            candidateName: inviteTarget.candidateName,
            candidateEmail: inviteTarget.candidateEmail,
            questionSetTitle: set.jobTitle,
            score: inviteTarget.score,
          }}
          onClose={() => setInviteTarget(null)}
          onSend={async (message) => {
            const { recommendationId } = await invitePractitioner(
              questionSetId,
              inviteTarget.candidateUserId,
              message
            );
            setInviteTarget(null);
            addToast("success", p.inviteSuccessOfferCta);
            if (recommendationId) {
              router.push(`/hr/candidate-recommendations/${recommendationId}`);
            } else {
              router.push("/hr/candidate-recommendations");
            }
          }}
        />
      )}
    </div>
  );
}
