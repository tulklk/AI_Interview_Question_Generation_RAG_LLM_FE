import { apiClient } from "@/core/api/http-client";
import type { RecommendationStatus } from "@/features/hr/services/recommendation.service";

// ---------------------------------------------------------------------------
// SCRUM-339: GET /api/hr/dashboard — one aggregate call replacing the old
// jobs+plans+recommendations client-side rollup. Swagger doesn't document the
// response body, so this normalizer is defensive (tolerant of naming
// variants) and every field is optional — callers fall back to the old
// per-endpoint aggregation whenever a section can't be parsed.
// ---------------------------------------------------------------------------

export interface HrDashboardKpis {
  totalSessions: number;
  completedSessions: number;
  totalQuestionsGenerated: number;
  successRate: number;
  thisMonthSessions: number;
  topRole: string;
}

export interface HrDashboardDailyActivity {
  date: string;
  sessions: number;
}

export interface HrDashboardQuestionType {
  type: string;
  count: number;
}

export interface HrDashboardRecentSession {
  id: string;
  role: string;
  level: string;
  status: string;
  questionsCount: number;
  createdAt: string;
}

export interface HrDashboardRecommendation {
  id: string;
  candidateName: string;
  candidateEmail: string;
  targetRole: string;
  score: number;
  status: RecommendationStatus;
}

export interface HrDashboardInsights {
  weekOverWeekTrend: "up" | "down" | "flat" | null;
  weekOverWeekDelta: number | null;
}

export interface HrDashboardData {
  kpis: HrDashboardKpis | null;
  dailyActivity: HrDashboardDailyActivity[];
  questionTypeDistribution: HrDashboardQuestionType[];
  recentSessions: HrDashboardRecentSession[];
  topRecommendations: HrDashboardRecommendation[];
  insights: HrDashboardInsights | null;
}

function asRecord(val: unknown): Record<string, unknown> | null {
  return val && typeof val === "object" && !Array.isArray(val) ? (val as Record<string, unknown>) : null;
}

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickNum(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
}

function pickArray(obj: Record<string, unknown>, ...keys: string[]): unknown[] {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

/** BE returns full ISO dates ("2026-07-16"); the chart expects the same compact "MM/DD" label the old client-side rollup used. */
function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

// Chuẩn hóa type về canonical display key — gộp system_design/SystemDesign/system-design, v.v.
const TYPE_ALIASES: Record<string, string> = {
  technical: "Technical",
  behavioral: "Behavioral",
  situational: "Situational",
  "system-design": "System-design",
  system_design: "System-design",
  systemdesign: "System-design",
  "problem-solving": "Problem-solving",
  problem_solving: "Problem-solving",
  problemsolving: "Problem-solving",
  "follow-up": "Follow-up",
  follow_up: "Follow-up",
  followup: "Follow-up",
};

function canonicalizeQuestionType(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const key = trimmed.toLowerCase().replace(/\s+/g, "-");
  const compact = key.replace(/[_-]/g, "");
  if (TYPE_ALIASES[key]) return TYPE_ALIASES[key];
  if (TYPE_ALIASES[compact]) return TYPE_ALIASES[compact];
  return trimmed
    .replace(/_/g, "-")
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("-");
}

function normalizeRoleTitle(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Chuỗi skills (nhiều dấu phẩy / quá dài) không phải role — bỏ để KPI không phình.
  if ((trimmed.match(/,/g) ?? []).length >= 2 || trimmed.length > 72) return "";
  return trimmed;
}

function normalizeKpis(src: Record<string, unknown>): HrDashboardKpis | null {
  const k = asRecord(src.kpis) ?? asRecord(src.Kpis);
  if (!k) return null;
  return {
    totalSessions: pickNum(k, "totalSessions", "totalJobs"),
    completedSessions: pickNum(k, "completedSessions", "completedJobs"),
    totalQuestionsGenerated: pickNum(k, "totalQuestionsGenerated", "totalQuestions"),
    successRate: pickNum(k, "successRatePercent", "successRate"),
    thisMonthSessions: pickNum(k, "thisMonthSessions", "sessionsThisMonth"),
    topRole: normalizeRoleTitle(pickStr(k, "topRole", "mostCommonRole")),
  };
}

function normalizeDailyActivity(src: Record<string, unknown>): HrDashboardDailyActivity[] {
  return pickArray(src, "dailyActivity", "DailyActivity")
    .map((raw) => asRecord(raw))
    .filter((r): r is Record<string, unknown> => r !== null)
    .map((r) => {
      const date = pickStr(r, "date", "day", "label");
      return { date: date ? formatShortDate(date) : "", sessions: pickNum(r, "sessions", "count", "value") };
    })
    .filter((d) => d.date !== "");
}

function normalizeQuestionTypes(src: Record<string, unknown>): HrDashboardQuestionType[] {
  const merged = new Map<string, number>();
  for (const raw of pickArray(src, "questionTypeDistribution", "QuestionTypeDistribution")) {
    const r = asRecord(raw);
    if (!r) continue;
    const type = canonicalizeQuestionType(pickStr(r, "type", "questionType", "label"));
    if (!type) continue;
    merged.set(type, (merged.get(type) ?? 0) + pickNum(r, "count", "value"));
  }
  return Array.from(merged.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

function normalizeRecentSessions(src: Record<string, unknown>): HrDashboardRecentSession[] {
  return pickArray(src, "recentSessions", "RecentSessions")
    .map((raw) => asRecord(raw))
    .filter((r): r is Record<string, unknown> => r !== null)
    .map((r) => ({
      id: pickStr(r, "id", "jobId", "sessionId"),
      role: pickStr(r, "role", "roleTitle", "jobTitle", "title"),
      level: pickStr(r, "level", "experienceLevel"),
      status: pickStr(r, "status") || "COMPLETED",
      questionsCount: pickNum(r, "questionsCount", "questionCount", "totalQuestions"),
      createdAt: pickStr(r, "createdAt", "generatedAt"),
    }))
    .filter((s) => s.id !== "");
}

function normalizeRecStatus(raw: string): RecommendationStatus {
  const u = raw.toUpperCase() as RecommendationStatus;
  return (["NEW", "VIEWED", "SHORTLISTED", "INVITED", "DISMISSED"] as RecommendationStatus[]).includes(u) ? u : "NEW";
}

function normalizeTopRecommendations(src: Record<string, unknown>): HrDashboardRecommendation[] {
  return pickArray(src, "topRecommendations", "TopRecommendations")
    .map((raw) => asRecord(raw))
    .filter((r): r is Record<string, unknown> => r !== null)
    .map((r) => ({
      id: pickStr(r, "id", "recommendationId"),
      candidateName: pickStr(r, "candidateName", "fullName", "name"),
      candidateEmail: pickStr(r, "candidateEmail", "email"),
      targetRole: pickStr(r, "targetRole", "role"),
      score: pickNum(r, "score", "overallScore"),
      status: normalizeRecStatus(pickStr(r, "status") || "NEW"),
    }))
    .filter((c) => c.id !== "");
}

function normalizeInsights(src: Record<string, unknown>): HrDashboardInsights | null {
  const i = asRecord(src.insights) ?? asRecord(src.Insights);
  if (!i) return null;
  const trendRaw = pickStr(i, "weekOverWeekTrend").toLowerCase();
  const trend = trendRaw === "up" || trendRaw === "down" || trendRaw === "flat" ? trendRaw : null;
  const deltaRaw = i.weekOverWeekDelta;
  return {
    weekOverWeekTrend: trend,
    weekOverWeekDelta: typeof deltaRaw === "number" ? deltaRaw : null,
  };
}

export interface GetHrDashboardParams {
  activityDays?: number;
  recentLimit?: number;
  recommendationsLimit?: number;
}

export async function getHrDashboard(params: GetHrDashboardParams = {}): Promise<HrDashboardData | null> {
  const res = await apiClient.get("/api/hr/dashboard", {
    params: {
      ActivityDays: params.activityDays,
      RecentLimit: params.recentLimit,
      RecommendationsLimit: params.recommendationsLimit,
    },
  });
  const root = asRecord(res.data);
  const src = (root ? asRecord(root.data) : null) ?? root;
  if (!src) return null;

  const kpis = normalizeKpis(src);
  const dailyActivity = normalizeDailyActivity(src);
  const questionTypeDistribution = normalizeQuestionTypes(src);
  const recentSessions = normalizeRecentSessions(src);
  const topRecommendations = normalizeTopRecommendations(src);
  const insights = normalizeInsights(src);

  // Nothing recognizable came back — treat as unusable so the caller can fall
  // back to the old per-endpoint aggregation instead of rendering all-zero KPIs.
  if (!kpis && dailyActivity.length === 0 && recentSessions.length === 0) return null;

  return { kpis, dailyActivity, questionTypeDistribution, recentSessions, topRecommendations, insights };
}
