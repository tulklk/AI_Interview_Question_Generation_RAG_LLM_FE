"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Flame,
  Loader2,
  RefreshCw,
  TrendingUp,
  Trophy,
  User,
} from "lucide-react";
import { FaGithub, FaLinkedinIn } from "react-icons/fa";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import { portalHeading, portalHeadingAlt, portalMutedBg, portalSubtext, portalSubtextAlt } from "@/shared/utils/portal-ui";
import {
  getHrCandidateOverview,
  type HrCandidateAchievementFlag,
  type HrCandidateOverview,
} from "@/features/hr/services/hr-candidate.service";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { buildPracticeHeatmapFromBuckets } from "@/features/candidate/utils/dashboard-analytics";
import { PracticeHeatmap } from "@/features/candidate/components/dashboard/practice-heatmap";

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-rose-500",
];

function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

function achievementMeta(
  id: string,
  items: {
    firstPractice: { title: string; description: string };
    streak7: { title: string; description: string };
    highScorer: { title: string; description: string };
    speedDemon: { title: string; description: string };
    consistentLearner: { title: string; description: string };
  }
): { title: string; description: string; icon: string } | null {
  switch (id) {
    case "first-practice":
      return { ...items.firstPractice, icon: "🎯" };
    case "streak-7":
      return { ...items.streak7, icon: "🔥" };
    case "high-scorer":
      return { ...items.highScorer, icon: "⭐" };
    case "speed-demon":
      return { ...items.speedDemon, icon: "⚡" };
    case "consistent-learner":
      return { ...items.consistentLearner, icon: "📚" };
    default:
      return null;
  }
}

function statusLabel(
  status: string,
  labels: { inProgress: string; completed: string; abandoned: string }
): string {
  const u = status.toUpperCase();
  if (u === "COMPLETED") return labels.completed;
  if (u === "ABANDONED") return labels.abandoned;
  return labels.inProgress;
}

export function HrCandidateOverviewPage({ candidateUserId }: { candidateUserId: string }) {
  const { t, lang } = useLanguage();
  const p = t.hrCandidateOverviewPage;
  const router = useRouter();
  const [data, setData] = useState<HrCandidateOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getHrCandidateOverview(candidateUserId));
    } catch (e) {
      setData(null);
      setError(e instanceof Error && e.message ? e.message : p.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [candidateUserId, p.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  const content = (() => {
    if (loading) {
      return (
        <div className="flex flex-col items-center gap-3 py-24">
          <Loader2 size={28} className="animate-spin text-primary" />
          <p className={cn("text-[14px]", portalSubtext)}>{p.loading}</p>
        </div>
      );
    }

    if (error || !data) {
      return (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <AlertCircle size={28} className="text-red-500" />
          <p className={cn("text-[14px]", portalSubtext)}>{error || p.loadFailed}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
          >
            <RefreshCw size={13} /> {p.retryBtn}
          </button>
        </div>
      );
    }

    const initials = getInitials(data.candidateName || data.candidateEmail);
    const earnedCount = data.achievements.filter((a) => a.earned).length;
    const streakLabel =
      data.currentStreakDays === 1
        ? `1 ${p.stats.day}`
        : `${data.currentStreakDays} ${p.stats.days}`;

    const visibleAchievements = data.achievements
      .map((a: HrCandidateAchievementFlag) => {
        const meta = achievementMeta(a.id, p.achievementItems);
        if (!meta) return null;
        return { ...a, ...meta };
      })
      .filter(Boolean) as Array<HrCandidateAchievementFlag & { title: string; description: string; icon: string }>;

    const practiceHeatmap = buildPracticeHeatmapFromBuckets(data.heatmapDays, 52, {
      currentStreak: data.currentStreakDays,
      longestStreak: data.longestStreakDays || undefined,
      activeDays: data.activeDaysInWindow || undefined,
    });

    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => router.back()}
          className={cn(
            "inline-flex items-center gap-1.5 text-[13px] font-medium hover:text-primary transition-colors",
            portalSubtext
          )}
        >
          <ArrowLeft size={14} /> {p.back}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="hr-glass-card p-5 flex flex-col gap-4"
          >
            <div className="flex flex-col items-center text-center gap-3 pt-1">
              {data.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.avatarUrl}
                  alt={data.candidateName}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-2xl object-cover"
                />
              ) : (
                <div
                  className={cn(
                    "w-16 h-16 rounded-2xl text-white text-xl font-extrabold flex items-center justify-center",
                    avatarColor(data.candidateName || data.candidateUserId)
                  )}
                >
                  {initials || <User size={22} />}
                </div>
              )}
              <div>
                <h1 className={cn("text-[17px] font-bold leading-tight", portalHeading)}>
                  {data.candidateName || "—"}
                </h1>
                <p className={cn("text-[12px] mt-0.5", portalSubtext)}>{data.candidateEmail}</p>
                {data.targetRole && (
                  <p className={cn("text-[12px] font-medium mt-1", portalSubtextAlt)}>{data.targetRole}</p>
                )}
                {data.seniorityLevel && (
                  <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{data.seniorityLevel}</p>
                )}
              </div>
            </div>

            {(data.linkedInUrl || data.githubUrl) && (
              <div className="flex justify-center gap-2">
                {data.linkedInUrl && (
                  <a
                    href={data.linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300"
                    title="LinkedIn"
                  >
                    <FaLinkedinIn size={14} />
                  </a>
                )}
                {data.githubUrl && (
                  <a
                    href={data.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    title="GitHub"
                  >
                    <FaGithub size={14} />
                  </a>
                )}
              </div>
            )}

            {data.bio && (
              <p className={cn("text-[12px] leading-relaxed text-center", portalSubtext)}>{data.bio}</p>
            )}

            {data.techStack.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {data.techStack.map((s) => (
                  <span
                    key={s}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="hr-glass-card p-5"
            >
              <p className={cn("text-[11px] mb-3", portalSubtextAlt)}>{p.statsHint}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className={cn("rounded-xl px-3 py-3 text-center", portalMutedBg)}>
                  <BookOpen size={14} className="mx-auto mb-1 text-blue-500" />
                  <p className={cn("text-[16px] font-extrabold tabular-nums", portalHeadingAlt)}>
                    {data.totalSessions}
                  </p>
                  <p className={cn("text-[10px]", portalSubtextAlt)}>{p.stats.sessions}</p>
                </div>
                <div className={cn("rounded-xl px-3 py-3 text-center", portalMutedBg)}>
                  <TrendingUp size={14} className="mx-auto mb-1 text-violet-500" />
                  <p className={cn("text-[16px] font-extrabold tabular-nums", portalHeadingAlt)}>
                    {data.averageScore != null ? `${data.averageScore.toFixed(1)}%` : "—"}
                  </p>
                  <p className={cn("text-[10px]", portalSubtextAlt)}>{p.stats.avgScore}</p>
                </div>
                <div className={cn("rounded-xl px-3 py-3 text-center", portalMutedBg)}>
                  <Trophy size={14} className="mx-auto mb-1 text-amber-500" />
                  <p className={cn("text-[16px] font-extrabold tabular-nums", portalHeadingAlt)}>
                    {data.bestScore != null ? `${data.bestScore.toFixed(1)}%` : "—"}
                  </p>
                  <p className={cn("text-[10px]", portalSubtextAlt)}>{p.stats.bestScore}</p>
                </div>
                <div className={cn("rounded-xl px-3 py-3 text-center", portalMutedBg)}>
                  <Flame size={14} className="mx-auto mb-1 text-orange-500" />
                  <p className={cn("text-[16px] font-extrabold tabular-nums", portalHeadingAlt)}>{streakLabel}</p>
                  <p className={cn("text-[10px]", portalSubtextAlt)}>{p.stats.streak}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="hr-glass-card p-5"
            >
              <div className="mb-3">
                <h2 className={cn("text-[13px] font-bold uppercase tracking-wider", portalSubtextAlt)}>
                  {p.heatmap.title}
                </h2>
                <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{p.heatmap.subtitle}</p>
              </div>
              {practiceHeatmap.activeDays === 0 ? (
                <p className={cn("text-[13px] py-6 text-center", portalSubtext)}>{p.heatmap.empty}</p>
              ) : (
                <PracticeHeatmap heatmap={practiceHeatmap} source="hr" />
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="hr-glass-card p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className={cn("text-[13px] font-bold uppercase tracking-wider", portalSubtextAlt)}>
                  {p.achievementsTitle}
                </h2>
                <span className={cn("text-[11px] font-semibold", portalSubtextAlt)}>
                  {earnedCount}/{visibleAchievements.length} {p.earned}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {visibleAchievements.map((ach) => (
                  <div
                    key={ach.id}
                    title={ach.description}
                    className={cn(
                      "rounded-xl border px-2.5 py-3 text-center transition-opacity",
                      ach.earned
                        ? "border-violet-200 bg-violet-50/80 dark:border-violet-800 dark:bg-violet-950/30"
                        : "border-gray-100 bg-gray-50/80 opacity-50 dark:border-gray-800 dark:bg-gray-900/40"
                    )}
                  >
                    <div className="text-lg mb-1">{ach.icon}</div>
                    <p className={cn("text-[11px] font-semibold leading-tight", portalHeadingAlt)}>{ach.title}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="hr-glass-card p-5"
            >
              <h2 className={cn("text-[13px] font-bold uppercase tracking-wider mb-1", portalSubtextAlt)}>
                {p.practiceTableTitle}
              </h2>
              <p className={cn("text-[11px] mb-3", portalSubtextAlt)}>{p.practiceTableHint}</p>

              {data.practiceOnMySets.length === 0 ? (
                <p className={cn("text-[13px] py-6 text-center", portalSubtext)}>{p.practiceEmpty}</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-900/50">
                        <th className={cn("px-3 py-2 text-left text-[11px] font-semibold", portalSubtextAlt)}>
                          {p.colTitle}
                        </th>
                        <th className={cn("px-3 py-2 text-left text-[11px] font-semibold", portalSubtextAlt)}>
                          {p.colStatus}
                        </th>
                        <th className={cn("px-3 py-2 text-center text-[11px] font-semibold", portalSubtextAlt)}>
                          {p.colScore}
                        </th>
                        <th className={cn("px-3 py-2 text-left text-[11px] font-semibold", portalSubtextAlt)}>
                          {p.colDate}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {data.practiceOnMySets.map((row, i) => (
                        <tr key={`${row.questionSetId}-${row.startedAt ?? i}`} className="hover:bg-gray-50/60 dark:hover:bg-gray-900/40">
                          <td className="px-3 py-2.5">
                            <Link
                              href={`/hr/history/${row.questionSetId}`}
                              className={cn("font-semibold text-primary hover:underline", portalHeadingAlt)}
                            >
                              {row.title}
                            </Link>
                          </td>
                          <td className={cn("px-3 py-2.5", portalSubtext)}>
                            {statusLabel(row.sessionStatus, p.statusLabels)}
                          </td>
                          <td className={cn("px-3 py-2.5 text-center tabular-nums font-semibold", portalHeadingAlt)}>
                            {row.overallScore != null ? row.overallScore.toFixed(0) : "—"}
                          </td>
                          <td className={cn("px-3 py-2.5", portalSubtext)}>
                            {row.completedAt
                              ? formatRelativeTime(row.completedAt, lang)
                              : row.startedAt
                                ? formatRelativeTime(row.startedAt, lang)
                                : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    );
  })();

  return (
    <AppShell
      pageTitle={data?.candidateName || p.heading}
      breadcrumb={[
        { label: "HR", href: "/hr/dashboard" },
        { label: p.heading },
      ]}
      fullWidth
    >
      {content}
    </AppShell>
  );
}
