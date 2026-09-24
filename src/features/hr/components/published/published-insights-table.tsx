"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BarChart3,
  Briefcase,
  BookOpen,
  Eye,
  GlobeOff,
  Loader2,
  MessageSquare,
  RefreshCw,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import {
  getPublishedOverview,
  unpublishQuestionSet,
  withAbandonedToast,
  type PublishedOverviewItem,
} from "@/features/interview/services/interview.service";
import { QuestionSetFeedbackPanel } from "@/features/hr/components/history/question-set-feedback-panel";
import { PublishedInsightsTableSkeleton } from "./published-skeletons";

function formatDate(iso: string | null, lang: "en" | "vi"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const iconBtn =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-200";

type SectionKind = "hiring" | "practice";

type Labels = ReturnType<typeof useLanguage>["t"]["publishedInsightsPage"];

function PublishedSectionTable({
  kind,
  items,
  busyId,
  lang,
  p,
  onUnpublish,
  onFeedback,
}: {
  kind: SectionKind;
  items: PublishedOverviewItem[];
  busyId: string | null;
  lang: "en" | "vi";
  p: Labels;
  onUnpublish: (item: PublishedOverviewItem) => void;
  onFeedback: (item: PublishedOverviewItem) => void;
}) {
  const isHiring = kind === "hiring";
  const attemptsCol = isHiring ? p.colApplicants : p.colAttempts;
  const peopleLabel = isHiring ? p.applicants : p.practitioners;

  if (items.length === 0) {
    return (
      <div className="rounded-b-xl border border-t-0 border-gray-200 bg-white px-4 py-10 text-center dark:border-gray-800 dark:bg-gray-950/40">
        <p className={cn("text-sm", portalSubtext)}>
          {isHiring ? p.sectionEmptyHiring : p.sectionEmptyPractice}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-b-xl border border-t-0 border-gray-200 dark:border-gray-800">
      <table className="w-full min-w-[920px] table-fixed text-left text-sm">
        {/* SCRUM-438: table-fixed tránh cột title phình theo nội dung dài → header lệch */}
        <colgroup>
          <col style={{ width: "28%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "8%" }} />
        </colgroup>
        <thead className="border-b border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-900/50">
          <tr>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {p.colTitle}
            </th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {p.colStatus}
            </th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {p.colPublished}
            </th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {p.colQuestions}
            </th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {p.colTimeLimit}
            </th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {attemptsCol}
            </th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {p.colAvgScore}
            </th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {p.colRating}
            </th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item) => {
            const busy = busyId === item.questionSetId;
            return (
              <tr key={item.questionSetId} className="bg-white dark:bg-gray-950">
                <td className="overflow-hidden px-3 py-3">
                  <Link
                    href={`/hr/published/${item.questionSetId}`}
                    className={cn("font-semibold hover:text-primary line-clamp-2", portalHeading)}
                  >
                    {item.title}
                  </Link>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                      isHiring
                        ? "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    )}
                  >
                    {isHiring ? p.statusOnJobs : p.statusOnMarketplace}
                  </span>
                </td>
                <td className={cn("px-3 py-3 whitespace-nowrap text-xs", portalSubtext)}>
                  {formatDate(item.publishedAt, lang)}
                </td>
                <td className={cn("px-3 py-3 tabular-nums", portalHeading)}>{item.questionCount}</td>
                <td className={cn("px-3 py-3 text-xs whitespace-nowrap", portalSubtext)}>
                  {item.timeLimitMinutes == null
                    ? p.noLimit
                    : p.minutes.replace("{{n}}", String(item.timeLimitMinutes))}
                </td>
                <td className="px-3 py-3">
                  <span className={cn("tabular-nums font-medium", portalHeading)}>
                    {item.attemptCount}
                  </span>
                  <span className={cn("ml-1 text-[11px]", portalSubtext)}>
                    ({item.completedCount}/{item.inProgressCount})
                  </span>
                </td>
                <td className={cn("px-3 py-3 tabular-nums", portalHeading)}>
                  {item.averageScore != null ? item.averageScore.toFixed(1) : "—"}
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center gap-1 text-xs font-medium">
                    <Star
                      size={12}
                      className={
                        item.averageRating != null
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300"
                      }
                    />
                    {item.averageRating != null ? item.averageRating.toFixed(1) : "—"}
                    <span className={portalSubtext}>({item.feedbackCount})</span>
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-0.5">
                    <Link
                      href={`/hr/published/${item.questionSetId}?tab=practitioners`}
                      title={peopleLabel}
                      className={iconBtn}
                    >
                      <Users size={14} />
                    </Link>
                    <button
                      type="button"
                      title={p.feedback}
                      className={iconBtn}
                      onClick={() => onFeedback(item)}
                    >
                      <MessageSquare size={14} />
                    </button>
                    <Link
                      href={`/hr/published/${item.questionSetId}`}
                      title={p.openDetail}
                      className={iconBtn}
                    >
                      <Eye size={14} />
                    </Link>
                    <button
                      type="button"
                      title={p.unpublish}
                      disabled={busy}
                      className={iconBtn}
                      onClick={() => onUnpublish(item)}
                    >
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <GlobeOff size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** SCRUM-438 / SCRUM-471: 2 khung riêng — Tuyển dụng | Luyện tập. */
export function PublishedInsightsTable() {
  const { t, lang } = useLanguage();
  const p = t.publishedInsightsPage;
  const { addToast } = useToast();

  const [items, setItems] = useState<PublishedOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<{ id: string; title: string } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await getPublishedOverview());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const hiringItems = useMemo(
    () => items.filter((x) => x.isHiringAssessment),
    [items]
  );
  const practiceItems = useMemo(
    () => items.filter((x) => !x.isHiringAssessment),
    [items]
  );

  async function handleUnpublish(item: PublishedOverviewItem) {
    setBusyId(item.questionSetId);
    try {
      const abandoned = await unpublishQuestionSet(item.questionSetId);
      setItems((prev) => prev.filter((x) => x.questionSetId !== item.questionSetId));
      addToast(
        "success",
        withAbandonedToast(t.historyPage.unpublishSuccess, abandoned, t.historyPage.unpublishAbandoned)
      );
    } catch (err) {
      addToast(
        "error",
        err instanceof Error && err.message ? err.message : t.historyPage.actionFailed
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <PublishedInsightsTableSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <AlertCircle size={28} className="text-red-500" />
        <p className={cn("text-sm", portalSubtext)}>{p.loadFailed}</p>
        <button
          type="button"
          onClick={() => void reload()}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <RefreshCw size={13} /> {p.retry}
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <BarChart3 className="h-8 w-8 text-gray-300 dark:text-gray-600" />
        <p className={cn("text-sm font-semibold", portalHeading)}>{p.emptyTitle}</p>
        <p className={cn("text-xs max-w-sm", portalSubtext)}>{p.emptyBody}</p>
        <Link href="/hr/history" className="mt-2 text-sm font-semibold text-primary hover:underline">
          {t.historyPage.heading}
        </Link>
      </div>
    );
  }

  const sections: {
    kind: SectionKind;
    title: string;
    sub: string;
    icon: typeof Briefcase;
    list: PublishedOverviewItem[];
    count: number;
  }[] = [
    {
      kind: "hiring",
      title: p.sectionHiringTitle,
      sub: p.sectionHiringSub,
      icon: Briefcase,
      list: hiringItems,
      count: hiringItems.length,
    },
    {
      kind: "practice",
      title: p.sectionPracticeTitle,
      sub: p.sectionPracticeSub,
      icon: BookOpen,
      list: practiceItems,
      count: practiceItems.length,
    },
  ];

  return (
    <>
      <div className="space-y-6">
        {sections.map((sec) => {
          const Icon = sec.icon;
          return (
            <section key={sec.kind} className="overflow-hidden rounded-xl">
              <div
                className={cn(
                  "flex items-start gap-3 border px-4 py-3 rounded-t-xl",
                  sec.kind === "hiring"
                    ? "border-violet-200 bg-violet-50/80 dark:border-violet-900/50 dark:bg-violet-950/30"
                    : "border-gray-200 bg-gray-50/90 dark:border-gray-800 dark:bg-gray-900/50"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    sec.kind === "hiring"
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
                      : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  )}
                >
                  <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={cn("text-sm font-bold", portalHeading)}>{sec.title}</h3>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                        sec.kind === "hiring"
                          ? "bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200"
                          : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      )}
                    >
                      {sec.count}
                    </span>
                  </div>
                  <p className={cn("mt-0.5 text-[12px]", portalSubtext)}>{sec.sub}</p>
                </div>
              </div>
              <PublishedSectionTable
                kind={sec.kind}
                items={sec.list}
                busyId={busyId}
                lang={lang === "vi" ? "vi" : "en"}
                p={p}
                onUnpublish={(item) => void handleUnpublish(item)}
                onFeedback={(item) =>
                  setFeedbackTarget({ id: item.questionSetId, title: item.title })
                }
              />
            </section>
          );
        })}
      </div>

      <QuestionSetFeedbackPanel
        open={!!feedbackTarget}
        questionSetId={feedbackTarget?.id ?? null}
        questionSetTitle={feedbackTarget?.title}
        onClose={() => setFeedbackTarget(null)}
      />
    </>
  );
}
