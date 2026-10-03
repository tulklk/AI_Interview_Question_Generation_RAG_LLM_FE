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

/** SCRUM-506: preview skill CV chưa đo sau bài chẩn đoán. */
export async function getScreeningPreview(): Promise<CoachScreeningPreview> {
  const res = await apiClient.get("/api/candidate/coach/screening/preview");
  const root = asRecord(res.data);
  const nested = asRecord(root?.data) ?? asRecord(root?.Data);
  return mapScreeningPreview(nested ?? extractData(res.data) ?? root);
}

/** SCRUM-506: sinh bài sàng lọc ngắn — không đụng level. */
export async function startCoachScreening(): Promise<CoachJob> {
  const res = await apiClient.post("/api/candidate/coach/screening", null, { timeout: 180_000 });
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
  /** English | Vietnamese — null nếu chưa chọn ở bước CV. */
  outputLanguage?: "English" | "Vietnamese" | null;
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
  /** SCRUM-494: catalog Role Family cho dropdown Vị trí mục tiêu */
  availableRoleFamilies: CoachRoleFamilyOption[];
  detectedSkills: string[];
}

export interface CoachFrameworkOption {
  roleKey: string;
  displayRole: string;
  technology?: string | null;
  levels: string[];
  provenance: string;
}

/** SCRUM-494 */
export interface CoachRoleFamilyOption {
  familyKey: string;
  displayName: string;
  groupName?: string | null;
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
  /** Kỹ năng CV ngoài nhóm trọng tâm — chỉ hỏi nhanh, không tính vào level. */
  isQuickCheck?: boolean;
}

/** SCRUM-509: tiêu chí level có cấu trúc — FE hiện Đạt/Chưa đạt. */
export interface CoachLevelCriteria {
  overall: number;
  overallThreshold: number;
  targetMetRatio: number;
  targetMetThreshold: number;
  requiredRatio: number;
  requiredThreshold: number;
  hardRatio: number;
  hardThreshold: number;
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
  /** SCRUM-509: null trên report cũ thiếu field. */
  levelCriteria?: CoachLevelCriteria | null;
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

export interface CoachDrillAttempt {
  sessionId: string;
  score?: number | null;
  completedAt?: string | null;
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
  /** SCRUM-484: session đã nộp — xem lại feedback */
  drillSessionId?: string | null;
  /** SCRUM-489: mọi phiên COMPLETED trên cùng set (cũ → mới) */
  drillAttempts?: CoachDrillAttempt[];
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  /** SCRUM-486 */
  knowledgeDocumentId?: string | null;
  canViewSource?: boolean;
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
  /** SCRUM-484: thứ tự luyện skill (0 = trước) */
  displayOrder?: number;
  /** SCRUM-488: điểm phải > giá trị này mới qua topic */
  drillPassScoreExclusiveMin?: number;
  /** SCRUM-506: screening = tín hiệu 1 câu, cần kiểm tra thêm */
  confidence?: string | null;
  items: CoachRoadmapItem[];
}

/** SCRUM-506: preview bài sàng lọc skill CV chưa đo. */
export interface CoachScreeningPreview {
  enabled: boolean;
  available: boolean;
  questionCount: number;
  questionsPerSkill: number;
  skills: string[];
  measuredSkills: string[];
  remainingUnmeasured: number;
  message?: string | null;
}

export type CoachRoadmapDraftItemPatch = {
  itemId: string;
  isIncluded?: boolean;
  sortOrder?: number;
};

export type CoachRoadmapDraftRoadmapPatch = {
  roadmapId: string;
  displayOrder: number;
};

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

function mapRoleFamilyOptions(raw: unknown): CoachRoleFamilyOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const src = asRecord(x) ?? {};
      return {
        familyKey: pickString(src, "familyKey", "FamilyKey"),
        displayName: pickString(src, "displayName", "DisplayName"),
        groupName: pickString(src, "groupName", "GroupName") || null,
      };
    })
    .filter((x) => x.familyKey || x.displayName);
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
    outputLanguage: (() => {
      const raw = pickString(src, "outputLanguage", "OutputLanguage");
      if (raw === "English" || raw === "Vietnamese") return raw;
      return null;
    })(),
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
    availableRoleFamilies: mapRoleFamilyOptions(
      src.availableRoleFamilies ?? src.AvailableRoleFamilies
    ),
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
    isQuickCheck: pickBool(src, "isQuickCheck", "IsQuickCheck"),
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

/** SCRUM-509: report cũ thiếu levelCriteria → null, FE ẩn khối. */
function mapLevelCriteria(src: Record<string, unknown> | null): CoachLevelCriteria | null {
  if (!src) return null;
  const overall = pickNumber(src, "overall", "Overall");
  const overallThreshold = pickNumber(src, "overallThreshold", "OverallThreshold");
  if (overall == null && overallThreshold == null) return null;
  return {
    overall: overall ?? 0,
    overallThreshold: overallThreshold ?? 0,
    targetMetRatio: pickNumber(src, "targetMetRatio", "TargetMetRatio") ?? 0,
    targetMetThreshold: pickNumber(src, "targetMetThreshold", "TargetMetThreshold") ?? 0,
    requiredRatio: pickNumber(src, "requiredRatio", "RequiredRatio") ?? 0,
    requiredThreshold: pickNumber(src, "requiredThreshold", "RequiredThreshold") ?? 0,
    hardRatio: pickNumber(src, "hardRatio", "HardRatio") ?? 0,
    hardThreshold: pickNumber(src, "hardThreshold", "HardThreshold") ?? 0,
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
    levelCriteria: mapLevelCriteria(asRecord(src.levelCriteria ?? src.LevelCriteria)),
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

function mapDrillAttempt(src: Record<string, unknown>): CoachDrillAttempt | null {
  const sessionId = pickString(src, "sessionId", "SessionId");
  if (!sessionId) return null;
  return {
    sessionId,
    score: pickNumber(src, "score", "Score") ?? null,
    completedAt: pickString(src, "completedAt", "CompletedAt") || null,
  };
}

function mapRoadmapItem(src: Record<string, unknown>): CoachRoadmapItem {
  const attemptsRaw = src.drillAttempts ?? src.DrillAttempts;
  const drillAttempts = Array.isArray(attemptsRaw)
    ? attemptsRaw
        .map((x) => mapDrillAttempt(asRecord(x) ?? {}))
        .filter((a): a is CoachDrillAttempt => Boolean(a?.sessionId))
    : [];
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
    drillSessionId: pickString(src, "drillSessionId", "DrillSessionId") || null,
    drillAttempts,
    sourceUrl: pickString(src, "sourceUrl", "SourceUrl") || null,
    sourceTitle: pickString(src, "sourceTitle", "SourceTitle") || null,
    knowledgeDocumentId: pickString(src, "knowledgeDocumentId", "KnowledgeDocumentId") || null,
    canViewSource: pickBool(src, "canViewSource", "CanViewSource"),
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
    displayOrder: pickNumber(src, "displayOrder", "DisplayOrder") ?? 0,
    drillPassScoreExclusiveMin:
      pickNumber(src, "drillPassScoreExclusiveMin", "DrillPassScoreExclusiveMin") ?? 70,
    confidence: pickString(src, "confidence", "Confidence") || null,
    items,
  };
}

function mapScreeningPreview(src: Record<string, unknown> | null): CoachScreeningPreview {
  if (!src) {
    return {
      enabled: false,
      available: false,
      questionCount: 0,
      questionsPerSkill: 1,
      skills: [],
      measuredSkills: [],
      remainingUnmeasured: 0,
      message: null,
    };
  }
  return {
    enabled: pickBool(src, "enabled", "Enabled"),
    available: pickBool(src, "available", "Available"),
    questionCount: pickNumber(src, "questionCount", "QuestionCount") ?? 0,
    questionsPerSkill: pickNumber(src, "questionsPerSkill", "QuestionsPerSkill") ?? 1,
    skills: pickStringList(src, "skills", "Skills"),
    measuredSkills: pickStringList(src, "measuredSkills", "MeasuredSkills"),
    remainingUnmeasured: pickNumber(src, "remainingUnmeasured", "RemainingUnmeasured") ?? 0,
    message: pickString(src, "message", "Message") || null,
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

export async function updateCoachOutputLanguage(
  outputLanguage: "English" | "Vietnamese"
): Promise<CoachContext> {
  const res = await apiClient.put("/api/candidate/coach/output-language", { outputLanguage });
  return mapContext(extractData(res.data));
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

function sortRoadmaps(list: CoachRoadmap[]): CoachRoadmap[] {
  return list
    .filter((r) => r.id && r.skill)
    .sort(
      (a, b) =>
        (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
        b.priorityScore - a.priorityScore
    );
}

export async function getCoachRoadmaps(): Promise<CoachRoadmap[]> {
  const res = await apiClient.get("/api/candidate/coach/roadmaps");
  const root = asRecord(res.data);
  const raw = root?.data ?? root?.Data ?? res.data;
  const list = Array.isArray(raw) ? raw : [];
  return sortRoadmaps(list.map((x) => mapRoadmap(asRecord(x) ?? {})));
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

/** SCRUM-462 / SCRUM-484: toggle + reorder topic/skill trên draft Suggested. */
export async function updateCoachRoadmapDraft(payload: {
  items?: CoachRoadmapDraftItemPatch[];
  roadmaps?: CoachRoadmapDraftRoadmapPatch[];
}): Promise<CoachRoadmap[]> {
  const res = await apiClient.patch("/api/candidate/coach/roadmaps/draft", {
    items: payload.items ?? [],
    roadmaps: payload.roadmaps ?? [],
  });
  const root = asRecord(res.data);
  const raw = root?.data ?? root?.Data ?? res.data;
  const list = Array.isArray(raw) ? raw : [];
  return sortRoadmaps(list.map((x) => mapRoadmap(asRecord(x) ?? {})));
}

/** SCRUM-462: Accept toàn bộ draft → Active. */
export async function acceptCoachRoadmaps(): Promise<CoachRoadmap[]> {
  const res = await apiClient.post("/api/candidate/coach/roadmaps/accept", {});
  const root = asRecord(res.data);
  const raw = root?.data ?? root?.Data ?? res.data;
  const list = Array.isArray(raw) ? raw : [];
  return sortRoadmaps(list.map((x) => mapRoadmap(asRecord(x) ?? {})));
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

/** SCRUM-507: tổng kết sau khi luyện xong. */
export interface CoachWrapUpSkillDelta {
  skill: string;
  baselineScore: number;
  currentScore: number;
  delta: number;
}

export interface CoachWrapUpSkill {
  skill: string;
  currentScore: number;
  targetScore: number;
}

export interface CoachWrapUpWeakTopic {
  skill: string;
  topic: string;
  lowestScore: number;
  overcame: boolean;
}

export interface CoachWrapUpNextSkill {
  skill: string;
  currentScore?: number | null;
  targetScore: number;
  gap: number;
  reason: "gap" | "screening" | string;
}

/** SCRUM-514: một câu đánh giá lại — Đạt khi điểm vượt ngưỡng drill. */
export interface CoachWrapUpAnswer {
  skill: string;
  questionPreview: string;
  score?: number | null;
  passed: boolean;
}

export interface CoachWrapUp {
  available: boolean;
  completedRoadmaps: number;
  totalRoadmaps: number;
  overallReadiness?: number | null;
  overallDelta?: number | null;
  achievedLevel?: string | null;
  targetReadinessStatus?: string | null;
  suggestedNextLevel?: string | null;
  suggestedNextLevelAvailable?: boolean;
  suggestedNextLevelMessage?: string | null;
  improved: CoachWrapUpSkillDelta[];
  strengths: CoachWrapUpSkill[];
  weakTopics: CoachWrapUpWeakTopic[];
  nextSkills: CoachWrapUpNextSkill[];
  answerPassedCount: number;
  answerTotalCount: number;
  answers: CoachWrapUpAnswer[];
}

function mapWrapUp(src: Record<string, unknown> | null): CoachWrapUp {
  if (!src) {
    return {
      available: false,
      completedRoadmaps: 0,
      totalRoadmaps: 0,
      improved: [],
      strengths: [],
      weakTopics: [],
      nextSkills: [],
      answerPassedCount: 0,
      answerTotalCount: 0,
      answers: [],
    };
  }
  const improvedRaw = src.improved ?? src.Improved;
  const strengthsRaw = src.strengths ?? src.Strengths;
  const weakRaw = src.weakTopics ?? src.WeakTopics;
  const nextRaw = src.nextSkills ?? src.NextSkills;
  const answersRaw = src.answers ?? src.Answers;
  return {
    available: pickBool(src, "available", "Available"),
    completedRoadmaps: pickNumber(src, "completedRoadmaps", "CompletedRoadmaps") ?? 0,
    totalRoadmaps: pickNumber(src, "totalRoadmaps", "TotalRoadmaps") ?? 0,
    overallReadiness: pickNumber(src, "overallReadiness", "OverallReadiness") ?? null,
    overallDelta: pickNumber(src, "overallDelta", "OverallDelta") ?? null,
    achievedLevel: pickString(src, "achievedLevel", "AchievedLevel") || null,
    targetReadinessStatus: pickString(src, "targetReadinessStatus", "TargetReadinessStatus") || null,
    suggestedNextLevel: pickString(src, "suggestedNextLevel", "SuggestedNextLevel") || null,
    suggestedNextLevelAvailable: pickBool(src, "suggestedNextLevelAvailable", "SuggestedNextLevelAvailable"),
    suggestedNextLevelMessage:
      pickString(src, "suggestedNextLevelMessage", "SuggestedNextLevelMessage") || null,
    improved: Array.isArray(improvedRaw)
      ? improvedRaw
          .map((x) => {
            const r = asRecord(x) ?? {};
            const skill = pickString(r, "skill", "Skill");
            if (!skill) return null;
            return {
              skill,
              baselineScore: pickNumber(r, "baselineScore", "BaselineScore") ?? 0,
              currentScore: pickNumber(r, "currentScore", "CurrentScore") ?? 0,
              delta: pickNumber(r, "delta", "Delta") ?? 0,
            };
          })
          .filter((x): x is CoachWrapUpSkillDelta => Boolean(x))
      : [],
    strengths: Array.isArray(strengthsRaw)
      ? strengthsRaw
          .map((x) => {
            const r = asRecord(x) ?? {};
            const skill = pickString(r, "skill", "Skill");
            if (!skill) return null;
            return {
              skill,
              currentScore: pickNumber(r, "currentScore", "CurrentScore") ?? 0,
              targetScore: pickNumber(r, "targetScore", "TargetScore") ?? 70,
            };
          })
          .filter((x): x is CoachWrapUpSkill => Boolean(x))
      : [],
    weakTopics: Array.isArray(weakRaw)
      ? weakRaw
          .map((x) => {
            const r = asRecord(x) ?? {};
            const skill = pickString(r, "skill", "Skill");
            const topic = pickString(r, "topic", "Topic");
            if (!skill || !topic) return null;
            return {
              skill,
              topic,
              lowestScore: pickNumber(r, "lowestScore", "LowestScore") ?? 0,
              overcame: pickBool(r, "overcame", "Overcame"),
            };
          })
          .filter((x): x is CoachWrapUpWeakTopic => Boolean(x))
      : [],
    nextSkills: Array.isArray(nextRaw)
      ? nextRaw
          .map((x): CoachWrapUpNextSkill | null => {
            const r = asRecord(x) ?? {};
            const skill = pickString(r, "skill", "Skill");
            if (!skill) return null;
            return {
              skill,
              currentScore: pickNumber(r, "currentScore", "CurrentScore") ?? null,
              targetScore: pickNumber(r, "targetScore", "TargetScore") ?? 70,
              gap: pickNumber(r, "gap", "Gap") ?? 0,
              reason: pickString(r, "reason", "Reason") || "gap",
            };
          })
          .filter((x): x is CoachWrapUpNextSkill => x != null)
      : [],
    answerPassedCount: pickNumber(src, "answerPassedCount", "AnswerPassedCount") ?? 0,
    answerTotalCount: pickNumber(src, "answerTotalCount", "AnswerTotalCount") ?? 0,
    answers: Array.isArray(answersRaw)
      ? answersRaw
          .map((x): CoachWrapUpAnswer | null => {
            const r = asRecord(x) ?? {};
            const preview = pickString(r, "questionPreview", "QuestionPreview");
            const skill = pickString(r, "skill", "Skill");
            if (!preview && !skill) return null;
            return {
              skill: skill || "—",
              questionPreview: preview || skill,
              score: pickNumber(r, "score", "Score") ?? null,
              passed: pickBool(r, "passed", "Passed"),
            };
          })
          .filter((x): x is CoachWrapUpAnswer => x != null)
      : [],
  };
}

export async function getCoachWrapUp(): Promise<CoachWrapUp> {
  const res = await apiClient.get("/api/candidate/coach/wrap-up");
  const root = asRecord(res.data);
  const nested = asRecord(root?.data) ?? asRecord(root?.Data);
  return mapWrapUp(nested ?? extractData(res.data) ?? root);
}

/** SCRUM-486: xem tài liệu nguồn KB gắn roadmap. */
export interface CoachKnowledgeView {
  documentId: string;
  fileName: string;
  contentType: "markdown" | "text" | "pdf" | "docx" | string;
  content?: string | null;
  url?: string | null;
  expiresAt?: string | null;
  sourceTitle?: string | null;
  previewText?: string | null;
}

export async function getCoachKnowledgeSourceView(documentId: string): Promise<CoachKnowledgeView> {
  const res = await apiClient.get(`/api/candidate/coach/knowledge-documents/${documentId}/view`);
  const root = asRecord(res.data);
  const raw =
    asRecord(root?.data) ??
    asRecord(root?.Data) ??
    extractData(res.data) ??
    root ??
    {};
  return {
    documentId: pickString(raw, "documentId", "DocumentId") || documentId,
    fileName: pickString(raw, "fileName", "FileName"),
    contentType: pickString(raw, "contentType", "ContentType") || "text",
    content: pickString(raw, "content", "Content") || null,
    url: pickString(raw, "url", "Url") || null,
    expiresAt: pickString(raw, "expiresAt", "ExpiresAt") || null,
    sourceTitle: pickString(raw, "sourceTitle", "SourceTitle") || null,
    previewText: pickString(raw, "previewText", "PreviewText") || null,
  };
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
