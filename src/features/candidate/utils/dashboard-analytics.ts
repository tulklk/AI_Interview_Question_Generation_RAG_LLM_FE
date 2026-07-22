import type { CompletedSessionSummary } from "@/features/candidate/services/practice-session.service";
import { readAnswerEvaluations } from "@/features/candidate/services/practice-session.service";
import { translateDimensionKey } from "@/features/candidate/utils/skill-labels";
import type { Lang } from "@/shared/providers/language-context";

// ── Formatters ──────────────────────────────────────────────────────────────

export function formatScore(score: number | null | undefined): string {
  return score === null || score === undefined ? "—" : `${Math.round(score)}%`;
}

export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export interface TrendResult {
  direction: "up" | "down" | "flat";
  deltaPct: number | null;
}

/** Percentage change of `current` vs `previous`. Null when there's no valid baseline to compare against. */
export function formatTrend(current: number | null, previous: number | null): TrendResult {
  if (current === null || previous === null || previous === 0) {
    return { direction: "flat", deltaPct: null };
  }
  const deltaPct = Math.round(((current - previous) / previous) * 100);
  if (deltaPct > 0) return { direction: "up", deltaPct };
  if (deltaPct < 0) return { direction: "down", deltaPct };
  return { direction: "flat", deltaPct: 0 };
}

function dayKey(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

// ── Readiness score ─────────────────────────────────────────────────────────

export type ReadinessLevel = "needsWork" | "developing" | "ready" | "veryReady";

export interface ReadinessFactor {
  key: "averageScore" | "consistency" | "stability" | "frequency";
  /** 0-100 contribution score for this factor before weighting. */
  value: number;
  weightPct: number;
}

export interface ReadinessResult {
  score: number | null;
  level: ReadinessLevel;
  factors: ReadinessFactor[];
}

/**
 * Client-side estimate only (no BE readiness endpoint exists yet). Combines
 * average score (how well), consistency/streak (how regularly), stability
 * (how low the variance across recent scores is), and practice frequency
 * over the last 30 days. Weights are a product judgment call, not a backend
 * contract — tune here only, nothing else derives from these numbers.
 */
export function calculateReadinessScore(
  sessions: CompletedSessionSummary[],
  averageScore: number | null,
  streakDays: number,
): ReadinessResult {
  const scored = sessions.filter((s) => s.score !== null) as (CompletedSessionSummary & { score: number })[];
  if (scored.length === 0 || averageScore === null) {
    return { score: null, level: "needsWork", factors: [] };
  }

  const consistencyValue = Math.min((streakDays / 14) * 100, 100);

  const recentScores = [...scored]
    .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime())
    .slice(0, 8)
    .map((s) => s.score);
  const mean = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const variance = recentScores.reduce((a, b) => a + (b - mean) ** 2, 0) / recentScores.length;
  const stdDev = Math.sqrt(variance);
  const stabilityValue = Math.max(0, 100 - stdDev * 2.5);

  const cutoff = daysAgo(30).getTime();
  const sessionsLast30 = scored.filter((s) => new Date(s.completedAt ?? 0).getTime() >= cutoff).length;
  const frequencyValue = Math.min((sessionsLast30 / 8) * 100, 100);

  const factors: ReadinessFactor[] = [
    { key: "averageScore", value: averageScore, weightPct: 50 },
    { key: "consistency", value: consistencyValue, weightPct: 20 },
    { key: "stability", value: stabilityValue, weightPct: 15 },
    { key: "frequency", value: frequencyValue, weightPct: 15 },
  ];

  const score = Math.round(factors.reduce((sum, f) => sum + (f.value * f.weightPct) / 100, 0));
  const level: ReadinessLevel = score >= 80 ? "veryReady" : score >= 60 ? "ready" : score >= 40 ? "developing" : "needsWork";

  return { score, level, factors };
}

// ── Performance trend ────────────────────────────────────────────────────────

export type TimeRangeKey = "7d" | "30d" | "90d" | "all";

export const TIME_RANGE_DAYS: Record<Exclude<TimeRangeKey, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function filterSessionsByRange(sessions: CompletedSessionSummary[], range: TimeRangeKey): CompletedSessionSummary[] {
  if (range === "all") return sessions;
  const cutoff = daysAgo(TIME_RANGE_DAYS[range]).getTime();
  return sessions.filter((s) => {
    const t = new Date(s.completedAt ?? 0).getTime();
    return !Number.isNaN(t) && t >= cutoff;
  });
}

export interface TrendPoint {
  date: string;
  score: number;
  sessionCount: number;
}

/** One point per calendar day with a score (averaged if multiple sessions landed the same day), oldest first. */
export function buildPerformanceTrend(sessions: CompletedSessionSummary[]): TrendPoint[] {
  const byDay = new Map<string, { total: number; count: number }>();
  for (const s of sessions) {
    if (s.score === null) continue;
    const key = dayKey(s.completedAt);
    if (!key) continue;
    const bucket = byDay.get(key) ?? { total: 0, count: 0 };
    bucket.total += s.score;
    bucket.count += 1;
    byDay.set(key, bucket);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, { total, count }]) => ({ date, score: Math.round(total / count), sessionCount: count }));
}

/** Compares average score in the most recent `days` window vs the equal-length window right before it. */
export function computePeriodComparison(
  sessions: CompletedSessionSummary[],
  days: number,
): { currentAvg: number | null; previousAvg: number | null } {
  const now = Date.now();
  const currentStart = now - days * 86400000;
  const previousStart = currentStart - days * 86400000;

  const avg = (list: CompletedSessionSummary[]) => {
    const scored = list.filter((s) => s.score !== null) as (CompletedSessionSummary & { score: number })[];
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((sum, s) => sum + s.score, 0) / scored.length);
  };

  const current = sessions.filter((s) => {
    const t = new Date(s.completedAt ?? 0).getTime();
    return t >= currentStart && t <= now;
  });
  const previous = sessions.filter((s) => {
    const t = new Date(s.completedAt ?? 0).getTime();
    return t >= previousStart && t < currentStart;
  });

  return { currentAvg: avg(current), previousAvg: avg(previous) };
}

// ── Practice consistency heatmap ─────────────────────────────────────────────

export interface HeatmapDay {
  date: string;
  minutes: number;
  count: number;
}

export interface PracticeHeatmapResult {
  days: HeatmapDay[];
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
}

export function buildPracticeHeatmap(sessions: CompletedSessionSummary[], weeks = 20): PracticeHeatmapResult {
  const byDay = new Map<string, HeatmapDay>();
  for (const s of sessions) {
    const key = dayKey(s.completedAt);
    if (!key) continue;
    const bucket = byDay.get(key) ?? { date: key, minutes: 0, count: 0 };
    bucket.minutes += s.durationMinutes;
    bucket.count += 1;
    byDay.set(key, bucket);
  }

  const totalDays = weeks * 7;
  const days: HeatmapDay[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const key = dayKey(d.toISOString())!;
    days.push(byDay.get(key) ?? { date: key, minutes: 0, count: 0 });
  }

  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) currentStreak++;
    else break;
  }

  let longestStreak = 0;
  let running = 0;
  for (const day of days) {
    if (day.count > 0) {
      running++;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 0;
    }
  }

  return { days, currentStreak, longestStreak, activeDays: byDay.size };
}

// ── Readiness by role/position ───────────────────────────────────────────────

export interface RoleReadiness {
  role: string;
  company: string;
  sessionCount: number;
  avgScore: number | null;
  lastPracticedAt: string | undefined;
  questionSetId: string;
}

/** Groups completed sessions by question-set title (the job role a set targets). */
export function buildRoleReadiness(sessions: CompletedSessionSummary[]): RoleReadiness[] {
  const groups = new Map<string, CompletedSessionSummary[]>();
  for (const s of sessions) {
    if (!s.setTitle) continue;
    const list = groups.get(s.setTitle) ?? [];
    list.push(s);
    groups.set(s.setTitle, list);
  }

  return [...groups.entries()]
    .map(([role, list]) => {
      const scored = list.filter((s) => s.score !== null) as (CompletedSessionSummary & { score: number })[];
      const sorted = [...list].sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime());
      return {
        role,
        company: sorted[0]?.company ?? "",
        sessionCount: list.length,
        avgScore: scored.length > 0 ? Math.round(scored.reduce((sum, s) => sum + s.score, 0) / scored.length) : null,
        lastPracticedAt: sorted[0]?.completedAt,
        questionSetId: sorted[0]?.questionSetId ?? "",
      };
    })
    .sort((a, b) => new Date(b.lastPracticedAt ?? 0).getTime() - new Date(a.lastPracticedAt ?? 0).getTime());
}

// ── Skill analytics (best-effort, from sessionStorage-captured dimension scores) ──

export interface SkillDatum {
  skill: string;
  score: number;
  previousScore: number | null;
}

export interface SkillAnalytics {
  skills: SkillDatum[];
  strongest: SkillDatum | null;
  weakest: SkillDatum | null;
  mostImproved: (SkillDatum & { deltaPct: number }) | null;
  sessionsAnalyzed: number;
}

/**
 * Per-question dimension scores only exist in sessionStorage (captured live
 * during a practice session, see practice-session.service) — there's no
 * persisted BE endpoint for historical skill breakdowns. This aggregates
 * whatever is still present in THIS browser's sessionStorage across the
 * given sessions, splitting each skill's readings into an earlier and later
 * half to estimate a trend. Returns null when nothing is available so the
 * caller can show an honest "not enough data" state instead of a fake chart.
 */
export function buildSkillAnalytics(sessions: CompletedSessionSummary[], lang: Lang): SkillAnalytics | null {
  const readings: Record<string, number[]> = {};
  let sessionsAnalyzed = 0;

  const chronological = [...sessions].sort(
    (a, b) => new Date(a.completedAt ?? 0).getTime() - new Date(b.completedAt ?? 0).getTime()
  );

  for (const session of chronological) {
    const evaluations = readAnswerEvaluations(session.id);
    const values = Object.values(evaluations);
    if (values.length === 0) continue;
    sessionsAnalyzed += 1;
    for (const evaluation of values) {
      if (!evaluation.dimensionScores) continue;
      for (const [key, value] of Object.entries(evaluation.dimensionScores)) {
        readings[key] ??= [];
        readings[key].push(value);
      }
    }
  }

  const keys = Object.keys(readings);
  if (keys.length === 0) return null;

  const skills: SkillDatum[] = keys.map((key) => {
    const values = readings[key];
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid || 1);
    const secondHalf = values.slice(mid || 1);
    const avg = (list: number[]) => (list.length > 0 ? list.reduce((a, b) => a + b, 0) / list.length : null);
    const overall = avg(values) ?? 0;
    const previous = secondHalf.length > 0 ? avg(firstHalf) : null;
    return {
      skill: translateDimensionKey(key, lang),
      score: Math.round(overall),
      previousScore: previous !== null ? Math.round(previous) : null,
    };
  });

  const sorted = [...skills].sort((a, b) => b.score - a.score);
  const strongest = sorted[0] ?? null;
  const weakest = sorted[sorted.length - 1] ?? null;

  const improved = skills
    .filter((s) => s.previousScore !== null && s.previousScore > 0)
    .map((s) => ({ ...s, deltaPct: Math.round(((s.score - (s.previousScore as number)) / (s.previousScore as number)) * 100) }))
    .sort((a, b) => b.deltaPct - a.deltaPct);
  const mostImproved = improved.length > 0 && improved[0].deltaPct > 0 ? improved[0] : null;

  return { skills, strongest, weakest, mostImproved, sessionsAnalyzed };
}

// ── AI Career Coach recommendations ─────────────────────────────────────────

/**
 * `evidenceKey`/`actionKey` select an i18n template from `jobseekerDashboardPage.coach`;
 * `tokens` fill that template's `{{placeholders}}` — keeps every recommendation
 * translatable while still citing real numbers from the caller's data.
 */
export interface CoachRecommendation {
  id: string;
  evidenceKey: string;
  tokens: Record<string, string>;
  actionKey: string;
  ctaHref: string;
  priority: "high" | "medium" | "low";
  estimatedMinutes: number;
}

export interface CoachContext {
  totalSessions: number;
  averageScore: number | null;
  streakDays: number;
  sessionsLast7Days: number;
  daysSinceLastSession: number | null;
  trend: TrendResult;
  skillAnalytics: SkillAnalytics | null;
  readiness: ReadinessResult;
}

/** Rule-based, evidence-grounded recommendations — every message cites a real number from `ctx`, never generic filler. */
export function buildAiRecommendations(ctx: CoachContext): CoachRecommendation[] {
  if (ctx.totalSessions === 0) {
    return [{
      id: "first-session",
      evidenceKey: "firstSession",
      tokens: {},
      actionKey: "firstSession",
      ctaHref: "/jobseeker/practice",
      priority: "high",
      estimatedMinutes: 15,
    }];
  }

  const recs: CoachRecommendation[] = [];

  if (ctx.skillAnalytics?.weakest && ctx.skillAnalytics.weakest.score < 65) {
    const { weakest, sessionsAnalyzed } = ctx.skillAnalytics;
    recs.push({
      id: "weak-skill",
      evidenceKey: "weakSkill",
      tokens: { skill: weakest.skill, score: String(weakest.score), sessions: String(sessionsAnalyzed) },
      actionKey: "weakSkill",
      ctaHref: "/jobseeker/practice",
      priority: "high",
      estimatedMinutes: 15,
    });
  }

  if (ctx.daysSinceLastSession !== null && ctx.daysSinceLastSession >= 5) {
    recs.push({
      id: "consistency",
      evidenceKey: "consistency",
      tokens: { days: String(ctx.daysSinceLastSession) },
      actionKey: "consistency",
      ctaHref: "/jobseeker/practice",
      priority: recs.length === 0 ? "high" : "medium",
      estimatedMinutes: 10,
    });
  }

  if (ctx.trend.direction === "down" && ctx.trend.deltaPct !== null && ctx.trend.deltaPct <= -5) {
    recs.push({
      id: "declining-trend",
      evidenceKey: "decliningTrend",
      tokens: { pct: String(Math.abs(ctx.trend.deltaPct)) },
      actionKey: "decliningTrend",
      ctaHref: "/jobseeker/history",
      priority: recs.length === 0 ? "high" : "medium",
      estimatedMinutes: 20,
    });
  }

  if (ctx.readiness.score !== null && ctx.readiness.score >= 80) {
    recs.push({
      id: "raise-bar",
      evidenceKey: "raiseBar",
      tokens: { score: String(ctx.readiness.score) },
      actionKey: "raiseBar",
      ctaHref: "/jobseeker/practice",
      priority: "low",
      estimatedMinutes: 25,
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "steady-progress",
      evidenceKey: "steadyProgress",
      tokens: { count: String(ctx.totalSessions), avg: String(ctx.averageScore ?? 0) },
      actionKey: "steadyProgress",
      ctaHref: "/jobseeker/practice",
      priority: "medium",
      estimatedMinutes: 15,
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  return recs.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 3);
}

/** Fills `{{token}}` placeholders in an i18n template string. */
export function fillTemplate(template: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce((str, [key, value]) => str.replaceAll(`{{${key}}}`, value), template);
}

// ── Sparkline ────────────────────────────────────────────────────────────────

/** Last `count` completed-session scores, oldest first — for a compact KPI sparkline. */
export function buildScoreSparkline(sessions: CompletedSessionSummary[], count = 10): number[] {
  return [...sessions]
    .filter((s) => s.score !== null)
    .sort((a, b) => new Date(a.completedAt ?? 0).getTime() - new Date(b.completedAt ?? 0).getTime())
    .slice(-count)
    .map((s) => s.score as number);
}

export function daysSince(iso: string | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
