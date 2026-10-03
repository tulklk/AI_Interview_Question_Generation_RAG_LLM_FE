"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Clock,
  EyeOff,
  FileText,
  Globe,
  GlobeOff,
  Loader2,
  MessageSquare,
  RefreshCw,
  Star,
  UserCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import {
  getDraft,
  getPractitioners,
  unpublishQuestionSet,
  withAbandonedToast,
  type Practitioner,
} from "@/features/interview/services/interview.service";
import type { DraftQuestionSet, GeneratedQuestion } from "@/features/interview/types/generation-session";
import {
  getHrQuestionSetFeedback,
  type HrFeedbackEntry,
} from "@/features/hr/services/hr-feedback.service";
import { PublishedHubPractitioners } from "./published-hub-practitioners";
import { PublishedHubFeedback } from "./published-hub-feedback";
import { PublishedHubInsights } from "./published-hub-insights";
import { PublishedHubReview } from "./published-hub-review";
import { PublishedSetHubSkeleton } from "./published-skeletons";

export type HubTab = "overview" | "insights" | "questions" | "practitioners" | "feedback" | "review";

/** Bộ đã publish: đủ tab; Review (xem/sửa nội dung bộ) nằm cuối. */
const PUBLISHED_TABS: HubTab[] = ["overview", "insights", "questions", "practitioners", "feedback", "review"];

function parseTab(raw: string | null, isPublished: boolean): HubTab {
  // Bộ chưa publish chưa có thống kê/người luyện/phản hồi → chỉ có Review.
  if (!isPublished) return "review";
  if (raw && (PUBLISHED_TABS as string[]).includes(raw)) return raw as HubTab;
  return "overview";
}

function isLive(q: GeneratedQuestion): boolean {
  return q.isActive !== false;
}

/** SCRUM-440: hub chi tiết 1 bộ đã publish. */
export function PublishedSetHub({ questionSetId }: { questionSetId: string }) {
  const { t } = useLanguage();
  const h = t.publishedHubPage;
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");

  const [draft, setDraft] = useState<DraftQuestionSet | null>(null);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<HrFeedbackEntry[]>([]);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [feedbackAvg, setFeedbackAvg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [showHiddenQuestions, setShowHiddenQuestions] = useState(false);
  /** SCRUM-471: bộ Tuyển — bật để xem thêm phiên luyện */
  const [includePractice, setIncludePractice] = useState(false);

  const setTab = useCallback(
    (next: HubTab) => {
      const q = new URLSearchParams(searchParams.toString());
      if (next === "overview") q.delete("tab");
      else q.set("tab", next);
      const qs = q.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [d, fb] = await Promise.all([
        getDraft(questionSetId),
        getHrQuestionSetFeedback(questionSetId, 1, 20),
      ]);
      if (!d) {
        setError(true);
        return;
      }
      setDraft(d);
      const hiring = Boolean(d.isHiringAssessment);
      const prac = await getPractitioners(questionSetId, {
        includePractice: hiring && includePractice,
      });
      setPractitioners(prac);
      setFeedbackItems(fb.items);
      setFeedbackTotal(fb.totalCount);
      setFeedbackAvg(fb.averageRating);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [questionSetId, includePractice]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const liveQuestions = useMemo(
    () => (draft?.questions ?? []).filter(isLive),
    [draft]
  );
  const hiddenCount = (draft?.questions.length ?? 0) - liveQuestions.length;

  const completed = useMemo(
    () => practitioners.filter((p) => p.status === "COMPLETED"),
    [practitioners]
  );
  const inProgress = useMemo(
    () => practitioners.filter((p) => p.status === "IN_PROGRESS").length,
    [practitioners]
  );
  const avgScore = useMemo(() => {
    const scores = completed.map((p) => p.score).filter((s): s is number => s != null);
    if (scores.length === 0) return null;
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  }, [completed]);

  async function handleUnpublish() {
    if (!draft || unpublishing) return;
    setUnpublishing(true);
    try {
      const abandoned = await unpublishQuestionSet(questionSetId);
      addToast(
        "success",
        withAbandonedToast(
          Boolean(draft?.isHiringAssessment) ? h.unpublishSuccessHiring : h.unpublishSuccess,
          abandoned,
          t.historyPage.unpublishAbandoned
        )
      );
      router.push("/hr/published");
    } catch (err) {
      addToast("error", err instanceof Error && err.message ? err.message : h.actionFailed);
    } finally {
      setUnpublishing(false);
    }
  }

  if (loading) {
    return <PublishedSetHubSkeleton />;
  }

  if (error || !draft) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <AlertCircle size={28} className="text-red-500" />
        <p className={cn("text-sm", portalSubtext)}>{h.loadFailed}</p>
        <button
          type="button"
          onClick={() => void reload()}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <RefreshCw size={13} /> {h.retry}
        </button>
      </div>
    );
  }

  const isPublished = draft.status === "PUBLISHED";
  const tab = parseTab(rawTab, isPublished);
  const isHiring = Boolean(draft.isHiringAssessment);
  const questionsForTab = showHiddenQuestions ? draft.questions : liveQuestions;

  const tabLabel: Record<HubTab, string> = {
    overview: h.tabOverview,
    insights: h.tabInsights,
    questions: h.tabQuestions,
    practitioners: isHiring ? h.tabApplicants : h.tabPractitioners,
    feedback: h.tabFeedback,
    review: h.tabReview,
  };

  return (
    <div className="space-y-5">
      {/* Tab Review có sẵn link "Quay lại lịch sử" riêng. */}
      {tab !== "review" && (
        <Link
          href="/hr/published"
          className={cn(
            "inline-flex items-center gap-1.5 text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors",
            portalSubtext
          )}
        >
          <ArrowLeft size={14} /> {h.backToList}
        </Link>
      )}

      {/* Tab Review đã có header riêng (tên, trạng thái, đổi tên) nên ẩn header của hub. */}
      {tab !== "review" && (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={cn("text-2xl font-bold truncate", portalHeading)}>{draft.jobTitle}</h1>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                !isPublished
                  ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  : isHiring
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              )}
            >
              {isPublished ? <Globe size={11} /> : <FileText size={11} />}
              {!isPublished
                ? h.statusDraft
                : isHiring
                  ? h.statusPublishedHiring
                  : h.statusPublishedMarketplace}
            </span>
          </div>
          <p className={cn("mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs", portalSubtext)}>
            <span>
              {h.liveCount
                .replace("{{live}}", String(liveQuestions.length))
                .replace("{{total}}", String(draft.questions.length))}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={11} />
              {draft.timeLimitMinutes == null
                ? h.noTimeLimit
                : h.timeLimit.replace("{{n}}", String(draft.timeLimitMinutes))}
            </span>
            <span className="inline-flex items-center gap-1">
              <UserCheck size={11} />
              {draft.autoRecommendEnabled === false
                ? h.recommendOff
                : h.recommendOn.replace("{{score}}", String(draft.recommendationMinScore ?? 70))}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isPublished && (
            <button
              type="button"
              disabled={unpublishing}
              onClick={() => void handleUnpublish()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
            >
              {unpublishing ? <Loader2 size={14} className="animate-spin" /> : <GlobeOff size={14} />}
              {h.unpublish}
            </button>
          )}
        </div>
      </div>
      )}

      {/* Tabs — bộ nháp chỉ có Review nên không cần thanh tab */}
      {isPublished && (
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800 pb-px">
        {PUBLISHED_TABS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "shrink-0 rounded-t-lg px-3.5 py-2 text-sm font-semibold transition-colors",
              tab === key
                ? "border-b-2 border-primary text-primary"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            {tabLabel[key]}
            {key === "questions" && (
              <span className="ml-1.5 text-[11px] tabular-nums opacity-70">{liveQuestions.length}</span>
            )}
            {key === "practitioners" && (
              <span className="ml-1.5 text-[11px] tabular-nums opacity-70">{practitioners.length}</span>
            )}
            {key === "feedback" && (
              <span className="ml-1.5 text-[11px] tabular-nums opacity-70">{feedbackTotal}</span>
            )}
          </button>
        ))}
      </div>
      )}

      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                icon: Users,
                label: isHiring ? h.metricApplicants : h.metricAttempts,
                value: String(practitioners.length),
                sub: (isHiring ? h.metricApplicantsSub : h.metricAttemptsSub)
                  .replace("{{done}}", String(completed.length))
                  .replace("{{progress}}", String(inProgress)),
              },
              {
                icon: BarChart3,
                label: h.metricAvgScore,
                value: avgScore != null ? avgScore.toFixed(1) : "—",
                sub: h.metricAvgScoreSub,
              },
              {
                icon: Star,
                label: h.metricRating,
                value: feedbackAvg != null ? feedbackAvg.toFixed(1) : "—",
                sub: h.feedbackCount.replace("{{n}}", String(feedbackTotal)),
              },
              {
                icon: Globe,
                label: h.metricLiveQuestions,
                value: String(liveQuestions.length),
                sub: h.liveCount
                  .replace("{{live}}", String(liveQuestions.length))
                  .replace("{{total}}", String(draft.questions.length)),
              },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/40"
              >
                <div className="flex items-center gap-2 text-gray-400">
                  <m.icon size={14} />
                  <span className="text-[11px] font-semibold uppercase tracking-wide">{m.label}</span>
                </div>
                <p className={cn("mt-2 text-2xl font-bold tabular-nums", portalHeading)}>{m.value}</p>
                <p className={cn("mt-0.5 text-[11px]", portalSubtext)}>{m.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className={cn("text-sm font-semibold", portalHeading)}>
                  {isHiring ? h.recentApplicants : h.recentPractitioners}
                </h3>
                <button type="button" onClick={() => setTab("practitioners")} className="text-xs font-semibold text-primary hover:underline">
                  {h.viewAll}
                </button>
              </div>
              <PublishedHubPractitioners
                items={practitioners}
                questionSetId={questionSetId}
                questionSetTitle={draft.jobTitle}
                isHiringAssessment={isHiring}
                limit={5}
              />
            </section>
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className={cn("text-sm font-semibold", portalHeading)}>{h.recentFeedback}</h3>
                <button type="button" onClick={() => setTab("feedback")} className="text-xs font-semibold text-primary hover:underline">
                  {h.viewAll}
                </button>
              </div>
              <PublishedHubFeedback
                questionSetId={questionSetId}
                initialItems={feedbackItems}
                initialTotal={feedbackTotal}
                initialAvg={feedbackAvg}
                previewLimit={3}
              />
            </section>
          </div>
        </div>
      )}

      {tab === "insights" && (
        <PublishedHubInsights
          questionSetId={questionSetId}
          isHiring={isHiring}
          includePractice={includePractice}
          onIncludePracticeChange={setIncludePractice}
        />
      )}

      {tab === "questions" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={cn("text-sm", portalSubtext)}>
              {h.liveCount
                .replace("{{live}}", String(liveQuestions.length))
                .replace("{{total}}", String(draft.questions.length))}
            </p>
            {hiddenCount > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={showHiddenQuestions}
                  onChange={(e) => setShowHiddenQuestions(e.target.checked)}
                  className="accent-[#6c47ff]"
                />
                <span className={portalHeading}>{h.showHidden.replace("{{n}}", String(hiddenCount))}</span>
              </label>
            )}
          </div>
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-950/40">
            {questionsForTab.map((q, idx) => {
              const live = isLive(q);
              const stt = draft.questions.findIndex((x) => x.id === q.id) + 1;
              return (
                <li key={q.id} className={cn("flex items-start gap-3 px-4 py-3", !live && "opacity-60 bg-gray-50/80 dark:bg-gray-900/40")}>
                  <span className="mt-0.5 inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-lg bg-gray-100 px-1.5 text-[11px] font-bold tabular-nums text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {stt || idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm leading-snug line-clamp-2", portalHeading)}>{q.question}</p>
                    <span
                      className={cn(
                        "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        live
                          ? "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      )}
                    >
                      {live ? (
                        <>
                          <Globe size={10} /> {isHiring ? h.badgeLiveHiring : h.badgeLive}
                        </>
                      ) : (
                        <>
                          <EyeOff size={10} /> {h.badgeHidden}
                        </>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          {questionsForTab.length === 0 && (
            <p className={cn("py-8 text-center text-sm", portalSubtext)}>{h.noQuestions}</p>
          )}
        </div>
      )}

      {tab === "practitioners" && (
        <div className="space-y-3">
          {isHiring && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 dark:border-gray-800 dark:bg-gray-950/40">
              <input
                type="checkbox"
                checked={includePractice}
                onChange={(e) => setIncludePractice(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span>
                <span className={cn("block text-xs font-semibold", portalHeading)}>{h.showPracticeToggle}</span>
                <span className={cn("block text-[11px] mt-0.5", portalSubtext)}>{h.showPracticeHint}</span>
              </span>
            </label>
          )}
          <PublishedHubPractitioners
            items={practitioners}
            questionSetId={questionSetId}
            questionSetTitle={draft.jobTitle}
            isHiringAssessment={isHiring}
          />
        </div>
      )}

      {tab === "feedback" && <PublishedHubFeedback questionSetId={questionSetId} />}

      {tab === "review" && (
        <PublishedHubReview
          draft={draft}
          onDraftChange={setDraft}
          onPublishStatusChange={(status) => {
            setDraft((prev) => (prev ? { ...prev, status } : prev));
            // Giữ người dùng ở tab Review sau khi publish/gỡ publish.
            setTab("review");
          }}
        />
      )}
    </div>
  );
}
