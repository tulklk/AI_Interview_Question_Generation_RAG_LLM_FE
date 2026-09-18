import { apiClient } from "@/core/api/http-client";

function asRecord(val: unknown): Record<string, unknown> | null {
  return val && typeof val === "object" ? (val as Record<string, unknown>) : null;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number") return v;
  }
  return undefined;
}

function extractData(raw: unknown): Record<string, unknown> | null {
  const root = asRecord(raw);
  if (!root) return null;
  const nested = asRecord(root.data) ?? asRecord(root.Data);
  if (nested && (nested.id || nested.Id || nested.status || nested.Status)) return nested;
  if (root.id || root.Id || root.status || root.Status) return root;
  return nested;
}

/** ExplanationJson đôi khi là {"reason":"..."} — chỉ lấy chuỗi đọc được. */
function unwrapExplanation(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (!t.startsWith("{")) return t;
  try {
    const obj = JSON.parse(t) as { reason?: unknown; explanation?: unknown };
    if (typeof obj.reason === "string" && obj.reason.trim()) return obj.reason.trim();
    if (typeof obj.explanation === "string" && obj.explanation.trim()) return obj.explanation.trim();
  } catch {
    /* ignore */
  }
  return t.startsWith("{") ? null : t;
}

export interface CoachJob {
  id: string;
  status: string;
  purpose?: string;
  questionSetId?: string | null;
  errorMessage?: string | null;
  /** system = có KB test-candidate; inferred = LLM theo blueprint/CV */
  kbSource?: "system" | "inferred" | string | null;
}

export interface CoachPlanItem {
  id: string;
  skill: string;
  baselineScore?: number | null;
  currentScore?: number | null;
  targetScore: number;
  status: string;
}

export interface CoachPlan {
  id: string;
  sourceDiagnosticSetId?: string | null;
  status: string;
  items: CoachPlanItem[];
}

function mapJob(src: Record<string, unknown> | null): CoachJob {
  if (!src) throw new Error("Invalid job payload");
  const kbRaw = pickString(src, "kbSource", "KbSource").toLowerCase();
  return {
    id: pickString(src, "id", "Id"),
    status: pickString(src, "status", "Status"),
    purpose: pickString(src, "purpose", "Purpose") || undefined,
    questionSetId: pickString(src, "questionSetId", "QuestionSetId") || null,
    errorMessage: pickString(src, "errorMessage", "ErrorMessage") || null,
    kbSource: kbRaw === "system" || kbRaw === "inferred" ? kbRaw : kbRaw || null,
  };
}

function mapItem(src: Record<string, unknown>): CoachPlanItem {
  return {
    id: pickString(src, "id", "Id"),
    skill: pickString(src, "skill", "Skill"),
    baselineScore: pickNumber(src, "baselineScore", "BaselineScore") ?? null,
    currentScore: pickNumber(src, "currentScore", "CurrentScore") ?? null,
    targetScore: pickNumber(src, "targetScore", "TargetScore") ?? 70,
    status: pickString(src, "status", "Status") || "pending",
  };
}

export async function startCvDiagnostic(): Promise<CoachJob> {
  const res = await apiClient.post("/api/candidate/coach/diagnostic", null, { timeout: 180_000 });
  return mapJob(extractData(res.data));
}

export async function getCoachJob(id: string): Promise<CoachJob> {
  const res = await apiClient.get(`/api/candidate/coach/jobs/${id}`);
  return mapJob(extractData(res.data));
}

export async function getActiveCoachJob(): Promise<CoachJob | null> {
  const res = await apiClient.get("/api/candidate/coach/jobs/active");
  const data = extractData(res.data);
  if (!data || !pickString(data, "id", "Id")) return null;
  return mapJob(data);
}

/** Huỷ job Queued/Generating — cho phép retry Coach. */
export async function cancelCoachJob(id: string): Promise<CoachJob> {
  const res = await apiClient.post(`/api/candidate/coach/jobs/${id}/cancel`, null);
  return mapJob(extractData(res.data));
}

export async function getCoachPlan(): Promise<CoachPlan | null> {
  const res = await apiClient.get("/api/candidate/coach/plan");
  const data = extractData(res.data);
  if (!data || !pickString(data, "id", "Id")) return null;
  const itemsRaw = data.items ?? data.Items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((x) => mapItem(asRecord(x) ?? {})).filter((i) => i.id && i.skill)
    : [];
  return {
    id: pickString(data, "id", "Id"),
    sourceDiagnosticSetId: pickString(data, "sourceDiagnosticSetId", "SourceDiagnosticSetId") || null,
    status: pickString(data, "status", "Status"),
    items,
  };
}

// ── SCRUM-447: Coach competency context / report / roadmaps ─────────────────

export interface CoachContext {
  suggestedRole?: string | null;
  targetRole?: string | null;
  selfAssessedLevel?: string | null;
  targetLevel?: string | null;
  yearsOfExperience?: number | null;
  interviewGoal?: string | null;
  summary?: string | null;
  skills: string[];
  contextConfirmed: boolean;
  contextConfirmedAt?: string | null;
  hasCv: boolean;
  matchedFrameworkRole?: string | null;
  matchedFrameworkLevel?: string | null;
  matchedFrameworkId?: string | null;
  matchedFrameworkTechnology?: string | null;
  frameworkResolved: boolean;
  frameworkLevelFallback: boolean;
  availableFrameworks: CoachFrameworkOption[];
  resolutionMode?: "FRAMEWORK" | "ADAPTIVE" | "UNSUPPORTED" | string;
  roleFamilyKey?: string | null;
  roleFamilyDisplay?: string | null;
  resolutionConfidence?: number;
  resolutionReason?: string | null;
  supportedRoles: string[];
  detectedSkills: string[];
}

export interface CoachFrameworkOption {
  roleKey: string;
  displayRole: string;
  technology?: string | null;
  levels: string[];
  provenance: string;
}

export interface UpdateCoachContextPayload {
  targetRole?: string;
  selfAssessedLevel?: string;
  targetLevel?: string;
  yearsOfExperience?: number;
}

export type CoachSkillBand = "strength" | "needs_improvement" | "critical_gap";

export interface CoachSkillResult {
  skill: string;
  skillScore: number;
  targetScore: number;
  gap: number;
  importanceWeight: number;
  demonstratedDifficulty?: string | null;
  band: CoachSkillBand;
  source?: string | null;
}

export interface CoachAssessment {
  id: string;
  kind: string;
  status: string;
  jobId?: string | null;
  questionSetId?: string | null;
  practiceSessionId?: string | null;
  overallReadiness?: number | null;
  readinessStatus?: string | null;
  meetsJuniorReadyRule: boolean;
  frameworkDisplayRole?: string | null;
  frameworkTargetLevel?: string | null;
  skills: CoachSkillResult[];
  explanation?: string | null;
  previousOverallReadiness?: number | null;
  overallDelta?: number | null;
  achievedLevel?: string | null;
  levelExplanation?: string | null;
  coverageRatio?: number | null;
  resolutionMode?: string | null;
  targetLevel?: string | null;
  targetThreshold?: number | null;
  readinessPercent?: number | null;
  estimatedBand?: string | null;
  targetReadinessStatus?: "READY" | "NOT_READY" | string | null;
  skillGaps: CoachSkillGap[];
  /** SCRUM-461: level liền kề khi READY */
  suggestedNextLevel?: string | null;
  suggestedNextLevelAvailable?: boolean;
  suggestedNextLevelMessage?: string | null;
}

export interface CoachSkillGap {
  skill: string;
  currentScore: number;
  targetScore: number;
  gap: number;
  priorityScore: number;
}

export interface CoachRoadmapItem {
  id: string;
  topic: string;
  subtopic?: string | null;
  sortOrder: number;
  status: string;
  isReassessmentGate: boolean;
  /** SCRUM-462: candidate chọn học topic này trong preview */
  isIncluded?: boolean;
  topicReason?: string | null;
  drillScore?: number | null;
  drillQuestionSetId?: string | null;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  prerequisites: string[];
  nextTopics: string[];
}

export interface CoachRoadmap {
  id: string;
  skill: string;
  currentScore?: number | null;
  targetScore: number;
  gap: number;
  priorityScore: number;
  kind: string;
  priority: string;
  status: string;
  explanation?: string | null;
  /** system = retrieve coach-roadmap; inferred = framework/nodes only */
  kbSource?: "system" | "inferred" | string | null;
  /** SCRUM-462: null = chưa Accept */
  acceptedAt?: string | null;
  /** cv | outsideCv */
  skillSource?: "cv" | "outsideCv" | string | null;
  outsideCvReason?: string | null;
  items: CoachRoadmapItem[];
}

function pickBool(obj: Record<string, unknown>, ...keys: string[]): boolean {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean") return v;
  }
  return false;
}

function pickStringList(obj: Record<string, unknown>, ...keys: string[]): string[] {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) {
      return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    }
  }
  return [];
}

function mapFrameworkOptions(raw: unknown): CoachFrameworkOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const src = asRecord(x) ?? {};
      return {
        roleKey: pickString(src, "roleKey", "RoleKey"),
        displayRole: pickString(src, "displayRole", "DisplayRole"),
        technology: pickString(src, "technology", "Technology") || null,
        levels: pickStringList(src, "levels", "Levels"),
        provenance: pickString(src, "provenance", "Provenance"),
      };
    })
    .filter((x) => x.roleKey || x.displayRole);
}

function mapContext(src: Record<string, unknown> | null): CoachContext {
  if (!src) throw new Error("Invalid context payload");
  return {
    suggestedRole: pickString(src, "suggestedRole", "SuggestedRole") || null,
    targetRole: pickString(src, "targetRole", "TargetRole") || null,
    selfAssessedLevel: pickString(src, "selfAssessedLevel", "SelfAssessedLevel") || null,
    targetLevel: pickString(src, "targetLevel", "TargetLevel") || null,
    yearsOfExperience: pickNumber(src, "yearsOfExperience", "YearsOfExperience") ?? null,
    interviewGoal: pickString(src, "interviewGoal", "InterviewGoal") || null,
    summary: pickString(src, "summary", "Summary") || null,
    skills: pickStringList(src, "skills", "Skills"),
    contextConfirmed: pickBool(src, "contextConfirmed", "ContextConfirmed"),
    contextConfirmedAt: pickString(src, "contextConfirmedAt", "ContextConfirmedAt") || null,
    hasCv: pickBool(src, "hasCv", "HasCv"),
    matchedFrameworkRole: pickString(src, "matchedFrameworkRole", "MatchedFrameworkRole") || null,
    matchedFrameworkLevel: pickString(src, "matchedFrameworkLevel", "MatchedFrameworkLevel") || null,
    matchedFrameworkId: pickString(src, "matchedFrameworkId", "MatchedFrameworkId") || null,
    matchedFrameworkTechnology: pickString(src, "matchedFrameworkTechnology", "MatchedFrameworkTechnology") || null,
    frameworkResolved: pickBool(src, "frameworkResolved", "FrameworkResolved"),
    frameworkLevelFallback: pickBool(src, "frameworkLevelFallback", "FrameworkLevelFallback"),
    availableFrameworks: mapFrameworkOptions(src.availableFrameworks ?? src.AvailableFrameworks),
    resolutionMode: (() => {
      const raw = pickString(src, "resolutionMode", "ResolutionMode").toUpperCase();
      if (raw === "FRAMEWORK" || raw === "ADAPTIVE" || raw === "UNSUPPORTED") return raw;
      return pickString(src, "matchedFrameworkId", "MatchedFrameworkId") ? "FRAMEWORK" : "UNSUPPORTED";
    })(),
    roleFamilyKey: pickString(src, "roleFamilyKey", "RoleFamilyKey") || null,
    roleFamilyDisplay: pickString(src, "roleFamilyDisplay", "RoleFamilyDisplay") || null,
    resolutionConfidence: pickNumber(src, "resolutionConfidence", "ResolutionConfidence") ?? 0,
    resolutionReason: pickString(src, "resolutionReason", "ResolutionReason") || null,
    supportedRoles: pickStringList(src, "supportedRoles", "SupportedRoles"),
    detectedSkills: pickStringList(src, "detectedSkills", "DetectedSkills"),
  };
}

function mapSkillResult(src: Record<string, unknown>): CoachSkillResult {
  const bandRaw = pickString(src, "band", "Band") || "needs_improvement";
  const band = (["strength", "needs_improvement", "critical_gap"].includes(bandRaw)
    ? bandRaw
    : "needs_improvement") as CoachSkillBand;
  return {
    skill: pickString(src, "skill", "Skill"),
    skillScore: pickNumber(src, "skillScore", "SkillScore") ?? 0,
    targetScore: pickNumber(src, "targetScore", "TargetScore") ?? 70,
    gap: pickNumber(src, "gap", "Gap") ?? 0,
    importanceWeight: pickNumber(src, "importanceWeight", "ImportanceWeight") ?? 1,
    demonstratedDifficulty: pickString(src, "demonstratedDifficulty", "DemonstratedDifficulty") || null,
    band,
    source: pickString(src, "source", "Source") || null,
  };
}

function mapSkillGap(src: Record<string, unknown>): CoachSkillGap {
  return {
    skill: pickString(src, "skill", "Skill"),
    currentScore: pickNumber(src, "currentScore", "CurrentScore") ?? 0,
    targetScore: pickNumber(src, "targetScore", "TargetScore") ?? 0,
    gap: pickNumber(src, "gap", "Gap") ?? 0,
    priorityScore: pickNumber(src, "priorityScore", "PriorityScore") ?? 0,
  };
}

function mapAssessment(src: Record<string, unknown> | null): CoachAssessment | null {
  if (!src || !pickString(src, "id", "Id")) return null;
  const skillsRaw = src.skills ?? src.Skills;
  const skills = Array.isArray(skillsRaw)
    ? skillsRaw.map((x) => mapSkillResult(asRecord(x) ?? {})).filter((s) => s.skill)
    : [];
  const gapsRaw = src.skillGaps ?? src.SkillGaps;
  const skillGaps = Array.isArray(gapsRaw)
    ? gapsRaw.map((x) => mapSkillGap(asRecord(x) ?? {})).filter((g) => g.skill)
    : [];
  return {
    id: pickString(src, "id", "Id"),
    kind: pickString(src, "kind", "Kind"),
    status: pickString(src, "status", "Status"),
    jobId: pickString(src, "jobId", "JobId") || null,
    questionSetId: pickString(src, "questionSetId", "QuestionSetId") || null,
    practiceSessionId: pickString(src, "practiceSessionId", "PracticeSessionId") || null,
    overallReadiness: pickNumber(src, "overallReadiness", "OverallReadiness") ?? null,
    readinessStatus: pickString(src, "readinessStatus", "ReadinessStatus") || null,
    meetsJuniorReadyRule: pickBool(src, "meetsJuniorReadyRule", "MeetsJuniorReadyRule"),
    frameworkDisplayRole: pickString(src, "frameworkDisplayRole", "FrameworkDisplayRole") || null,
    frameworkTargetLevel: pickString(src, "frameworkTargetLevel", "FrameworkTargetLevel") || null,
    skills,
    explanation: pickString(src, "explanation", "Explanation") || null,
    previousOverallReadiness: pickNumber(src, "previousOverallReadiness", "PreviousOverallReadiness") ?? null,
    overallDelta: pickNumber(src, "overallDelta", "OverallDelta") ?? null,
    achievedLevel: pickString(src, "achievedLevel", "AchievedLevel") || null,
    levelExplanation: pickString(src, "levelExplanation", "LevelExplanation") || null,
    coverageRatio: pickNumber(src, "coverageRatio", "CoverageRatio") ?? null,
    resolutionMode: pickString(src, "resolutionMode", "ResolutionMode") || null,
    targetLevel: pickString(src, "targetLevel", "TargetLevel") || null,
    targetThreshold: pickNumber(src, "targetThreshold", "TargetThreshold") ?? null,
    readinessPercent: pickNumber(src, "readinessPercent", "ReadinessPercent") ?? null,
    estimatedBand: pickString(src, "estimatedBand", "EstimatedBand") || null,
    targetReadinessStatus: pickString(src, "targetReadinessStatus", "TargetReadinessStatus") || null,
    skillGaps,
    suggestedNextLevel: pickString(src, "suggestedNextLevel", "SuggestedNextLevel") || null,
    suggestedNextLevelAvailable: pickBool(src, "suggestedNextLevelAvailable", "SuggestedNextLevelAvailable"),
    suggestedNextLevelMessage:
      pickString(src, "suggestedNextLevelMessage", "SuggestedNextLevelMessage") || null,
  };
}

function mapRoadmapItem(src: Record<string, unknown>): CoachRoadmapItem {
  return {
    id: pickString(src, "id", "Id"),
    topic: pickString(src, "topic", "Topic"),
    subtopic: pickString(src, "subtopic", "Subtopic") || null,
    sortOrder: pickNumber(src, "sortOrder", "SortOrder") ?? 0,
    status: pickString(src, "status", "Status") || "Pending",
    isReassessmentGate: pickBool(src, "isReassessmentGate", "IsReassessmentGate"),
    isIncluded: (() => {
      for (const k of ["isIncluded", "IsIncluded"]) {
        const v = src[k];
        if (typeof v === "boolean") return v;
      }
      return true;
    })(),
    topicReason: pickString(src, "topicReason", "TopicReason") || null,
    drillScore: pickNumber(src, "drillScore", "DrillScore") ?? null,
    drillQuestionSetId: pickString(src, "drillQuestionSetId", "DrillQuestionSetId") || null,
    sourceUrl: pickString(src, "sourceUrl", "SourceUrl") || null,
    sourceTitle: pickString(src, "sourceTitle", "SourceTitle") || null,
    prerequisites: pickStringList(src, "prerequisites", "Prerequisites"),
    nextTopics: pickStringList(src, "nextTopics", "NextTopics"),
  };
}

function mapRoadmap(src: Record<string, unknown>): CoachRoadmap {
  const itemsRaw = src.items ?? src.Items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw
        .map((x) => mapRoadmapItem(asRecord(x) ?? {}))
        .filter((i) => i.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  return {
    id: pickString(src, "id", "Id"),
    skill: pickString(src, "skill", "Skill"),
    currentScore: pickNumber(src, "currentScore", "CurrentScore") ?? null,
    targetScore: pickNumber(src, "targetScore", "TargetScore") ?? 70,
    gap: pickNumber(src, "gap", "Gap") ?? 0,
    priorityScore: pickNumber(src, "priorityScore", "PriorityScore") ?? 0,
    kind: pickString(src, "kind", "Kind") || "gap",
    priority: pickString(src, "priority", "Priority") || "medium",
    status: pickString(src, "status", "Status"),
    explanation: unwrapExplanation(pickString(src, "explanation", "Explanation") || null),
    kbSource: (() => {
      const raw = pickString(src, "kbSource", "KbSource").toLowerCase();
      if (raw === "system") return "system";
      return "inferred";
    })(),
    acceptedAt: pickString(src, "acceptedAt", "AcceptedAt") || null,
    skillSource: (() => {
      const raw = pickString(src, "skillSource", "SkillSource");
      if (raw === "outsideCv") return "outsideCv";
      if (raw === "cv" || !raw) return "cv";
      return raw;
    })(),
    outsideCvReason: pickString(src, "outsideCvReason", "OutsideCvReason") || null,
    items,
  };
}

export async function getCoachContext(): Promise<CoachContext> {
  const res = await apiClient.get("/api/candidate/coach/context");
  return mapContext(extractData(res.data));
}

export async function listCoachFrameworks(): Promise<CoachFrameworkOption[]> {
  const res = await apiClient.get("/api/candidate/coach/frameworks");
  const root = asRecord(res.data);
  const raw = root?.data ?? root?.Data ?? res.data;
  return mapFrameworkOptions(raw);
}

export async function updateCoachContext(payload: UpdateCoachContextPayload): Promise<CoachContext> {
  const res = await apiClient.put("/api/candidate/coach/context", payload);
  return mapContext(extractData(res.data));
}

/** SCRUM-463: chỉnh danh sách công nghệ trên Phân tích CV (không Confirm Goal). */
export async function updateCoachSkills(skills: string[]): Promise<CoachContext> {
  const res = await apiClient.put("/api/candidate/coach/skills", { skills });
  return mapContext(extractData(res.data));
}

/** SCRUM-459: soft-reset vòng Coach — về Confirm Goal, giữ CV. */
export async function resetCoachRun(): Promise<CoachContext> {
  const res = await apiClient.post("/api/candidate/coach/reset-run", null);
  return mapContext(extractData(res.data));
}

export async function getCoachReport(): Promise<CoachAssessment | null> {
  const res = await apiClient.get("/api/candidate/coach/report");
  const data = extractData(res.data);
  if (!data) return null;
  return mapAssessment(data);
}

/** Chấm lại diagnostic từ session đã nộp — mở khóa Báo cáo/Lộ trình nếu lần Complete bị miss scoring. */
export async function rescoreCoachReport(): Promise<CoachAssessment | null> {
  const res = await apiClient.post("/api/candidate/coach/report/rescore", null, { timeout: 120_000 });
  const data = extractData(res.data);
  if (!data) return null;
  return mapAssessment(data);
}

export async function getCoachAssessment(id: string): Promise<CoachAssessment | null> {
  const res = await apiClient.get(`/api/candidate/coach/assessments/${id}`);
  return mapAssessment(extractData(res.data));
}

export async function getCoachRoadmaps(): Promise<CoachRoadmap[]> {
  const res = await apiClient.get("/api/candidate/coach/roadmaps");
  const root = asRecord(res.data);
  const raw = root?.data ?? root?.Data ?? res.data;
  const list = Array.isArray(raw) ? raw : [];
  return list.map((x) => mapRoadmap(asRecord(x) ?? {})).filter((r) => r.id && r.skill);
}

export async function getCoachRoadmap(id: string): Promise<CoachRoadmap | null> {
  const res = await apiClient.get(`/api/candidate/coach/roadmaps/${id}`);
  const data = extractData(res.data);
  if (!data || !pickString(data, "id", "Id")) return null;
  return mapRoadmap(data);
}

export async function startCoachRoadmap(id: string): Promise<CoachRoadmap> {
  const res = await apiClient.post(`/api/candidate/coach/roadmaps/${id}/start`, null);
  return mapRoadmap(extractData(res.data) ?? {});
}

/** SCRUM-462: toggle IsIncluded trên draft Suggested. */
export async function updateCoachRoadmapDraft(
  items: Array<{ itemId: string; isIncluded: boolean }>
): Promise<CoachRoadmap[]> {
  const res = await apiClient.patch("/api/candidate/coach/roadmaps/draft", { items });
  const root = asRecord(res.data);
  const raw = root?.data ?? root?.Data ?? res.data;
  const list = Array.isArray(raw) ? raw : [];
  return list.map((x) => mapRoadmap(asRecord(x) ?? {})).filter((r) => r.id && r.skill);
}

/** SCRUM-462: Accept toàn bộ draft → Active. */
export async function acceptCoachRoadmaps(): Promise<CoachRoadmap[]> {
  const res = await apiClient.post("/api/candidate/coach/roadmaps/accept", {});
  const root = asRecord(res.data);
  const raw = root?.data ?? root?.Data ?? res.data;
  const list = Array.isArray(raw) ? raw : [];
  return list.map((x) => mapRoadmap(asRecord(x) ?? {})).filter((r) => r.id && r.skill);
}

export async function startRoadmapItemDrill(roadmapId: string, itemId: string): Promise<CoachJob> {
  const res = await apiClient.post(
    `/api/candidate/coach/roadmaps/${roadmapId}/items/${itemId}/drill`,
    null,
    { timeout: 180_000 }
  );
  return mapJob(extractData(res.data));
}

export async function startRoadmapReassessment(roadmapId: string): Promise<CoachJob> {
  const res = await apiClient.post(
    `/api/candidate/coach/roadmaps/${roadmapId}/reassessment`,
    null,
    { timeout: 180_000 }
  );
  return mapJob(extractData(res.data));
}

export function coachResolutionMode(context: CoachContext | null | undefined): string {
  return (context?.resolutionMode ?? "").toUpperCase();
}

/** FRAMEWORK + ADAPTIVE được Start Diagnostic; UNSUPPORTED thì chặn. */
export function canStartCoachDiagnostic(context: CoachContext | null | undefined): boolean {
  const mode = coachResolutionMode(context);
  if (mode === "UNSUPPORTED") return false;
  if (mode === "ADAPTIVE" || mode === "FRAMEWORK") return true;
  return Boolean(context?.matchedFrameworkId);
}
