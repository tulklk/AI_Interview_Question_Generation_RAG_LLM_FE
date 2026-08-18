"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
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
import { SectionCard } from "@/features/candidate/components/ui/section-card";

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

// ── Score ring — same SVG component as recommendation-detail ──────────────
function ScoreRing({ score, label, quality }: { score: number; label: string; quality: string }) {
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const dash = (Math.min(100, Math.max(0, score)) / 100) * circ;
  const color = score >= 85 ? "#10b981" : score >= 70 ? "#f59e0b" : "#ef4444";
  const textColor =
    score >= 85
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 70
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-500 dark:text-red-400";

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-24 h-24 shrink-0">
        <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="currentColor"
            strokeWidth="6" className="text-gray-100 dark:text-gray-800" />
          <motion.circle
            cx="48" cy="48" r={radius} fill="none" stroke={color}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            initial={{ strokeDasharray: `0 ${circ}` }}
            animate={{ strokeDasharray: `${dash} ${circ - dash}` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-[20px] font-black leading-none tabular-nums", textColor)}>{Math.round(score)}</span>
          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold mt-0.5">/100</span>
        </div>
      </div>
      <div>
        <p className={cn("text-[10px] font-semibold uppercase tracking-widest mb-1.5", portalSubtextAlt)}>
          {label}
        </p>
        <p className={cn("text-[16px] font-bold leading-tight", textColor)}>{quality}</p>
      </div>
    </div>
  );
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

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="hr-glass-card p-5 flex flex-col gap-5"
          >
            {/* ── Avatar + identity ── */}
            <div className="flex flex-col items-center text-center gap-3 pt-1">
              {data.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.avatarUrl}
                  alt={data.candidateName}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-full ring-2 ring-white dark:ring-gray-700 shadow-md object-cover"
                />
              ) : (
                <div
                  className={cn(
                    "w-20 h-20 rounded-full ring-2 ring-white dark:ring-gray-700 shadow-md text-white text-xl font-extrabold flex items-center justify-center",
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

            {/* ── Social links — before score ring, matching recommendation-detail order ── */}
            {(data.linkedInUrl || data.githubUrl) && (
              <div className="flex justify-center gap-2">
                {data.linkedInUrl && (
                  <a
                    href={data.linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="GitHub"
                  >
                    <FaGithub size={14} />
                  </a>
                )}
              </div>
            )}

            {/* ── Best-score ring ── */}
            {data.bestScore != null && (
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 px-4 py-4">
                <ScoreRing
                  score={data.bestScore}
                  label={p.stats.bestScore}
                  quality={
                    data.bestScore >= 85
                      ? p.scoreExcellent
                      : data.bestScore >= 70
                        ? p.scoreGood
                        : p.scoreFair
                  }
                />
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

          {/* ── Right: practice profile — same motion wrapper as recommendation-detail ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex flex-col gap-5 min-w-0"
          >
            <h1 className={cn("text-[22px] font-extrabold", portalHeadingAlt)}>{p.heading}</h1>

            {/* ① Stats */}
            <SectionCard
              title={p.statsTitle}
              icon={TrendingUp}
              iconBg="bg-violet-50 dark:bg-violet-950/40"
              iconColor="text-violet-600 dark:text-violet-400"
            >
              <p className={cn("text-[11px] -mt-2 mb-4", portalSubtextAlt)}>{p.statsHint}</p>
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
                    {data.averageScore != null ? `${data.averageScore.toFixed(1)}` : "—"}
                  </p>
                  <p className={cn("text-[10px]", portalSubtextAlt)}>{p.stats.avgScore}</p>
                </div>
                <div className={cn("rounded-xl px-3 py-3 text-center", portalMutedBg)}>
                  <Trophy size={14} className="mx-auto mb-1 text-amber-500" />
                  <p className={cn("text-[16px] font-extrabold tabular-nums", portalHeadingAlt)}>
                    {data.bestScore != null ? `${data.bestScore.toFixed(1)}` : "—"}
                  </p>
                  <p className={cn("text-[10px]", portalSubtextAlt)}>{p.stats.bestScore}</p>
                </div>
                <div className={cn("rounded-xl px-3 py-3 text-center", portalMutedBg)}>
                  <Flame size={14} className="mx-auto mb-1 text-orange-500" />
                  <p className={cn("text-[16px] font-extrabold tabular-nums", portalHeadingAlt)}>{streakLabel}</p>
                  <p className={cn("text-[10px]", portalSubtextAlt)}>{p.stats.streak}</p>
                </div>
              </div>
            </SectionCard>

            {/* ② Heatmap */}
            <SectionCard
              title={p.heatmap.title}
              icon={Activity}
              iconBg="bg-blue-50 dark:bg-blue-950/40"
              iconColor="text-blue-600 dark:text-blue-400"
            >
              <p className={cn("text-[11px] -mt-2 mb-4", portalSubtextAlt)}>{p.heatmap.subtitle}</p>
              {practiceHeatmap.activeDays === 0 ? (
                <p className={cn("text-[13px] py-6 text-center", portalSubtext)}>{p.heatmap.empty}</p>
              ) : (
                <PracticeHeatmap heatmap={practiceHeatmap} source="hr" />
              )}
            </SectionCard>

            {/* ③ Achievements */}
            <SectionCard
              title={p.achievementsTitle}
              icon={Trophy}
              iconBg="bg-amber-50 dark:bg-amber-950/40"
              iconColor="text-amber-600 dark:text-amber-400"
            >
              <div className="flex items-center justify-between -mt-2 mb-4">
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
            </SectionCard>

            {/* ④ Practice table */}
            <SectionCard
              title={p.practiceTableTitle}
              icon={BookOpen}
              iconBg="bg-emerald-50 dark:bg-emerald-950/40"
              iconColor="text-emerald-600 dark:text-emerald-400"
            >
              <p className={cn("text-[11px] -mt-2 mb-4", portalSubtextAlt)}>{p.practiceTableHint}</p>
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
                        <th className={cn("px-3 py-2 text-right text-[11px] font-semibold", portalSubtextAlt)}>
                          {p.colActions}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {data.practiceOnMySets.map((row, i) => {
                        const completed = row.sessionStatus.toUpperCase() === "COMPLETED" && row.sessionId;
                        return (
                          <tr
                            key={`${row.sessionId || row.questionSetId}-${row.startedAt ?? i}`}
                            className="hover:bg-gray-50/60 dark:hover:bg-gray-900/40"
                          >
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
                            <td className="px-3 py-2.5 text-right">
                              {completed ? (
                                <Link
                                  href={`/hr/candidates/${data.candidateUserId}/sessions/${row.sessionId}`}
                                  className="text-[12px] font-medium text-primary hover:underline"
                                >
                                  {p.viewAnswersBtn}
                                </Link>
                              ) : (
                                <span className={portalSubtext}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </motion.div>
        </div>
      </div>
    );
  })();

  return (
    <AppShell
      pageTitle={data?.candidateName || p.heading}
      breadcrumb={[
        { label: "HR", href: "/hr/dashboard" },
        { label: t.hrTalentPage.heading, href: "/hr/talent" },
        { label: data?.candidateName || p.heading },
      ]}
      fullWidth
    >
      {content}
    </AppShell>
  );
}
