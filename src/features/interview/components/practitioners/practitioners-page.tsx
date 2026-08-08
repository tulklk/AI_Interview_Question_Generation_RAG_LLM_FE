"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle, ArrowLeft, Clock, Globe, GlobeOff, Loader2, RefreshCw, Users,
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
  type Practitioner,
  type PractitionerSessionStatus,
} from "@/features/interview/services/interview.service";
import type { DraftQuestionSet } from "@/features/interview/types/generation-session";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { portalHeading, portalHeadingAlt, portalSubtext, portalSubtextAlt } from "@/shared/utils/portal-ui";

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

function scoreColor(score: number | null): string {
  if (score === null) return "text-gray-400 dark:text-gray-500";
  if (score >= 85) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-[14px] font-extrabold tabular-nums text-gray-400 dark:text-gray-500">—</span>;
  }
  const bar = score >= 85 ? "bg-emerald-500" : score >= 70 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex flex-col items-center gap-1 min-w-11">
      <span className={cn("text-[14px] font-extrabold tabular-nums leading-none", scoreColor(score))}>{score}</span>
      <div className="w-8 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ status, labels }: { status: PractitionerSessionStatus; labels: Record<string, string> }) {
  const styles: Record<PractitionerSessionStatus, string> = {
    IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
    COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
    ABANDONED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  };
  const text: Record<PractitionerSessionStatus, string> = {
    IN_PROGRESS: labels.inProgress, COMPLETED: labels.completed, ABANDONED: labels.abandoned,
  };
  return (
    <span className={cn("inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap", styles[status])}>
      {text[status]}
    </span>
  );
}

export function PractitionersPage({ questionSetId }: { questionSetId: string }) {
  const { t, lang } = useLanguage();
  const p = t.practitionersPage;
  const rp = t.reviewPage;
  const { addToast } = useToast();

  const [set, setSet] = useState<DraftQuestionSet | null>(null);
  const [items, setItems] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmingPublishToggle, setConfirmingPublishToggle] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [setData, practitioners] = await Promise.all([
        getDraft(questionSetId),
        getPractitioners(questionSetId),
      ]);
      if (!setData) { setError(true); return; }
      setSet(setData);
      setItems(practitioners);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [questionSetId]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  async function handlePublishToggle() {
    if (!set || publishing) return;
    setPublishing(true);
    try {
      if (set.status === "PUBLISHED") {
        await unpublishQuestionSet(questionSetId);
        setSet((s) => (s ? { ...s, status: "DRAFT" } : s));
        addToast("success", rp.unpublishSuccess);
      } else {
        await publishQuestionSet(questionSetId);
        setSet((s) => (s ? { ...s, status: "PUBLISHED" } : s));
        addToast("success", rp.publishSuccess);
      }
    } catch (err) {
      addToast("error", err instanceof Error && err.message ? err.message : rp.publishFailed);
    } finally {
      setPublishing(false);
      setConfirmingPublishToggle(false);
    }
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
            <h2 className={cn("text-2xl font-bold", portalHeading)}>{set.jobTitle}</h2>
            <p className={cn("text-sm mt-1", portalSubtext)}>{p.subtext}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfirmingPublishToggle(true)}
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

      {items.length === 0 ? (
        <div className="hr-glass-card p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl hr-icon-box flex items-center justify-center">
            <Users size={22} className="text-[#7C3AED] dark:text-[#a78bff]" />
          </div>
          <p className={cn("text-sm font-medium", portalHeading)}>{p.emptyTitle}</p>
          <p className={cn("text-xs", portalSubtext)}>{p.emptySubtext}</p>
        </div>
      ) : (
        <div className="hr-glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40">
                  <th className={cn("text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider", portalSubtextAlt)}>{p.candidate}</th>
                  <th className={cn("text-center px-4 py-3 text-[11px] font-semibold uppercase tracking-wider", portalSubtextAlt)}>{p.score}</th>
                  <th className={cn("text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider", portalSubtextAlt)}>{p.status}</th>
                  <th className={cn("text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider hidden sm:table-cell", portalSubtextAlt)}>{p.completedAt}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const initials = getInitials(item.candidateName || item.candidateEmail);
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/hr/candidates/${item.candidateUserId}`}
                          className="flex items-center gap-3 group min-w-0"
                          title={t.hrCandidateOverviewPage.viewOverview}
                        >
                          <div className={cn("w-9 h-9 rounded-xl text-white text-[12px] font-bold flex items-center justify-center shrink-0", avatarColor(item.candidateName || item.id))}>
                            {initials || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className={cn("text-[13px] font-semibold leading-tight truncate group-hover:text-primary transition-colors", portalHeadingAlt)}>{item.candidateName || "—"}</p>
                            <p className={cn("text-[11px] truncate", portalSubtextAlt)}>{item.candidateEmail}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <ScoreCell score={item.score} />
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={item.status} labels={p.statusLabels} />
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className={cn("text-[12px] flex items-center gap-1.5", portalSubtextAlt)}>
                          <Clock size={11} />
                          {item.completedAt ? formatRelativeTime(item.completedAt, lang) : item.startedAt ? formatRelativeTime(item.startedAt, lang) : "—"}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmingPublishToggle}
        title={set.status === "PUBLISHED" ? rp.unpublishConfirmTitle : rp.publishConfirmTitle}
        message={set.status === "PUBLISHED" ? rp.unpublishConfirmMessage : rp.publishConfirmMessage}
        confirmLabel={set.status === "PUBLISHED" ? rp.unpublish : rp.publish}
        cancelLabel={rp.cancelBtn}
        variant={set.status === "PUBLISHED" ? "danger" : "primary"}
        loading={publishing}
        onConfirm={() => void handlePublishToggle()}
        onCancel={() => setConfirmingPublishToggle(false)}
      />
    </div>
  );
}
