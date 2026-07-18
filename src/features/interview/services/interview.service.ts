import { apiClient } from "@/core/api/http-client";
import type {
  GenerationSession,
  GenerationStatus,
  GeneratedQuestion,
  QuestionType,
  DifficultyLevel,
  PlanDraft,
  DraftQuestionSet,
  QuestionAIChat,
  QuestionSuggestion,
} from "@/features/interview/types/generation-session";

// ---------------------------------------------------------------------------
// Backend API types
// ---------------------------------------------------------------------------

interface CreateJobResponseData {
  id?: string;
  jobId?: string;
  data?: { id?: string; jobId?: string };
  code?: number;
}

interface BackendJobQuestion {
  id?: string;
  questionId?: string;  // some BE responses use this instead of id
  question: string;
  questionType?: string;
  difficulty?: string;
  rationale?: string;
  sampleAnswer?: string;
  order?: number;
  orderIndex?: number;
}

interface BackendJobSummary {
  role?: string;
  level?: string;
  experience_level?: string;
  numberOfQuestions?: number;
  questionTypes?: string[];
  skills?: string[];
}

interface BackendJobPlan {
  roleTitle?: string;
  summary?: string;
  difficulty?: string;
  level?: string;
  experienceLevel?: string;
  totalQuestions?: number;
  skills?: string[];
}

interface BackendJobUI {
  isPolling?: boolean;
  statusLabel?: string;
  suggestedAction?: string;
  actions?: {
    canPoll?: boolean;
    canEditInput?: boolean;
    canRetryPlan?: boolean;
    canRetryQuestions?: boolean;
    canEditPlan?: boolean;
    canApprovePlan?: boolean;
    canEditQuestions?: boolean;
    canSaveDraft?: boolean;
    canViewDraft?: boolean;
  };
}

interface BackendJobMeta {
  hasDraft?: boolean;
  questionSetId?: string;
  questionCount?: number;
}

interface BackendJobFailure {
  reason?: string;
  stage?: string;
  detail?: string;
}

interface BackendJob {
  id?: string;
  jobId?: string;
  jobDescription?: string;
  jobDescriptionPreview?: string;
  hrNote?: string;
  numberOfQuestions?: number;
  difficulty?: string;
  questionTypes?: string[];
  skills?: string[];
  phase?: string;
  status?: string;
  summary?: BackendJobSummary;
  plan?: BackendJobPlan;
  questions?: BackendJobQuestion[];
  questionCount?: number;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string | null;
  hasDraft?: boolean;
  ui?: BackendJobUI;
  meta?: BackendJobMeta;
  failure?: BackendJobFailure;
  input?: Record<string, unknown>;
}

interface BackendJobListResponse {
  data?: { items?: BackendJob[]; totalCount?: number } | BackendJob[];
  items?: BackendJob[];
  code?: number;
}

interface BackendQuestionsResponse {
  data?: BackendJobQuestion[] | { items?: BackendJobQuestion[] };
  items?: BackendJobQuestion[];
  code?: number;
}

interface SaveDraftResponse {
  data?: { questionSetId?: string };
  code?: number;
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

const ALLOWED_QUESTION_TYPES: QuestionType[] = [
  "Technical",
  "Behavioral",
  "Situational",
  "System-design",
  "Problem-solving",
];

function normalizeQuestionType(raw?: string): QuestionType {
  if (!raw) return "Technical";
  // Handle kebab → Title-case variants the BE might send
  const map: Record<string, QuestionType> = {
    technical: "Technical",
    behavioral: "Behavioral",
    situational: "Situational",
    "system-design": "System-design",
    systemdesign: "System-design",
    "system design": "System-design",
    "problem-solving": "Problem-solving",
    problemsolving: "Problem-solving",
    "problem solving": "Problem-solving",
    // Legacy FE value — keep mapping so old DB rows still show
    "competency-based": "Technical",
    competency: "Technical",
  };
  const key = raw.toLowerCase().trim();
  if (map[key]) return map[key];
  const titled = (raw.charAt(0).toUpperCase() + raw.slice(1)) as QuestionType;
  return ALLOWED_QUESTION_TYPES.includes(titled) ? titled : "Technical";
}

function normalizeLevel(raw?: string): string {
  if (!raw) return "";
  const map: Record<string, string> = {
    intern: "Intern",
    junior: "Junior",
    mid: "Mid-level",
    medium: "Mid-level",
    "mid-level": "Mid-level",
    "mid level": "Mid-level",
    senior: "Senior",
    lead: "Lead",
    manager: "Manager",
  };
  const key = raw.toLowerCase().trim();
  return map[key] ?? (raw.charAt(0).toUpperCase() + raw.slice(1));
}

function normalizeDifficulty(raw?: string): DifficultyLevel {
  const allowed: DifficultyLevel[] = ["Easy", "Medium", "Hard"];
  const normalized = raw
    ? ((raw.charAt(0).toUpperCase() + raw.slice(1)) as DifficultyLevel)
    : "Medium";
  return allowed.includes(normalized) ? normalized : "Medium";
}

function mapJobPhaseToStatus(phase: string): GenerationStatus {
  const p = phase.toUpperCase();
  if (p === "COMPLETED") return "COMPLETED";
  if (p === "FAILED") return "FAILED";
  if (p === "PLAN_QUEUED") return "PLAN_QUEUED";
  if (p === "PLAN_PROCESSING") return "PLAN_PROPOSED";
  if (p === "WAITING_HR_APPROVAL") return "PLAN_PROPOSED";
  if (p === "QUESTION_QUEUED") return "QUESTION_QUEUED";
  if (p === "QUESTION_PROCESSING") return "QUESTION_PROCESSING";
  if (p === "PROCESSING") return "PROCESSING";
  if (p === "QUEUED") return "QUEUED";
  if (p === "CONFIRMED") return "CONFIRMED";
  if (p.includes("PLAN")) return "PLAN_PROPOSED";
  return "COMPLETED";
}

function mapJobToSession(job: BackendJob): GenerationSession {
  const summ = job.summary;
  const role = job.plan?.roleTitle ?? summ?.role ?? "";
  const id = job.jobId ?? job.id ?? "";
  const ui = job.ui;
  const meta = job.meta;

  return {
    id,
    jobTitle: role || "Interview Questions",
    jdContent: job.jobDescription ?? job.jobDescriptionPreview,
    hrOwner: "",
    status: mapJobPhaseToStatus(job.phase ?? job.status ?? "COMPLETED"),
    planDraft: {
      role,
      level: normalizeLevel(
        job.plan?.experienceLevel ??
        summ?.experience_level
      ),
      difficulty: normalizeDifficulty(
        job.plan?.difficulty ??
        job.plan?.level ??
        summ?.level
      ),
      questionCount:
        job.numberOfQuestions ??
        summ?.numberOfQuestions ??
        job.plan?.totalQuestions ??
        job.questionCount ??
        (job.questions?.length ?? 0),
      questionTypes: (job.questionTypes ?? summ?.questionTypes ?? ["Technical"]).map(normalizeQuestionType),
      topics: job.plan?.skills ?? summ?.skills ?? job.skills ?? [],
      summary: job.plan?.summary,
    },
    generatedQuestions: job.questions?.length
      ? job.questions.map((q, i) => ({
          id: q.id ?? q.questionId ?? `q-${i}`,
          question: q.question,
          questionType: normalizeQuestionType(q.questionType),
          difficulty: normalizeDifficulty(q.difficulty),
          rationale: q.rationale,
          sampleAnswer: q.sampleAnswer,
          citations: [],
          orderIndex: q.order ?? q.orderIndex ?? i,
        }))
      // Use actual generated count from BE (meta or top-level) for the list count display
      : Array.from({ length: meta?.questionCount ?? job.questionCount ?? 0 }, (_, i) => ({
          id: `stub-${id}-${i}`,
          question: "",
          questionType: "Technical" as QuestionType,
          difficulty: "Medium" as DifficultyLevel,
          citations: [],
          orderIndex: i,
        })),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt ?? job.completedAt ?? job.createdAt,
    // BE-driven UI guidance
    suggestedAction: ui?.suggestedAction,
    isPolling: ui?.isPolling ?? false,
    statusLabel: ui?.statusLabel,
    hasDraft: meta?.hasDraft ?? job.hasDraft ?? false,
    questionSetId: meta?.questionSetId,
    canRetryPlan: ui?.actions?.canRetryPlan ?? false,
    canRetryQuestions: ui?.actions?.canRetryQuestions ?? false,
    canEditInput: ui?.actions?.canEditInput ?? false,
    canEditPlan: ui?.actions?.canEditPlan ?? false,
    canApprovePlan: ui?.actions?.canApprovePlan ?? false,
    failureMessage: job.failure?.reason ?? job.failure?.detail,
  };
}

// ---------------------------------------------------------------------------
// Job CRUD
// ---------------------------------------------------------------------------

export async function createGenerationJob(payload: {
  jobDescription?: string;
  hrNote?: string;
  numberOfQuestions?: number;
  difficulty?: string;
  questionTypes?: string[];
  skills?: string[];
  knowledgeDocumentId?: string;
}): Promise<string | null> {
  try {
    const { data } = await apiClient.post<CreateJobResponseData>(
      "/api/hr/question-generation-jobs/plan",
      payload
    );
    const id = data?.data?.jobId ?? data?.data?.id ?? data?.jobId ?? data?.id;
    return id ?? null;
  } catch (err) {
    const respData = (err as { response?: { data?: { detail?: string; error?: string; errors?: string[] } } })?.response?.data;
    const detail = respData?.detail ?? respData?.errors?.[0] ?? respData?.error;
    if (detail) throw new Error(detail);
    return null;
  }
}

export async function getGenerationJob(id: string): Promise<GenerationSession | null> {
  try {
    const { data } = await apiClient.get<BackendJob | { data?: BackendJob }>(
      `/api/hr/question-generation-jobs/${id}`
    );
    const job = (data as { data?: BackendJob }).data ?? (data as BackendJob);
    return mapJobToSession(job);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Plans API — richer metadata (jobTitle, role, level, questionCount)
// ---------------------------------------------------------------------------

interface BackendPlanItem {
  jobId: string;
  jobTitle?: string;
  role?: string;
  level?: string;
  question?: number;        // actual generated count
  createdAt: string;
  status?: string;
  isPlanApproved?: boolean;
}

function mapPlanToSession(p: BackendPlanItem): GenerationSession {
  const status = mapJobPhaseToStatus(p.status ?? "");
  const count = p.question ?? 0;
  return {
    id: p.jobId,
    jobTitle: p.jobTitle || "Interview Questions",
    hrOwner: "",
    status,
    planDraft: {
      role: p.jobTitle ?? "",
      level: normalizeLevel(p.level),
      questionCount: count,
      questionTypes: ["Technical"],
      topics: [],
    },
    generatedQuestions: Array.from({ length: count }, (_, i) => ({
      id: `stub-${p.jobId}-${i}`,
      question: "",
      questionType: "Technical" as QuestionType,
      difficulty: "Medium" as DifficultyLevel,
      citations: [],
      orderIndex: i,
    })),
    createdAt: p.createdAt,
    updatedAt: p.createdAt,
    isPolling: false,
  };
}

export async function getGenerationPlans(): Promise<GenerationSession[]> {
  try {
    const { data } = await apiClient.get<{ data?: { items?: BackendPlanItem[] } }>(
      "/api/hr/question-generation-plans"
    );
    const items = (data as { data?: { items?: BackendPlanItem[] } })?.data?.items ?? [];
    return items.map(mapPlanToSession);
  } catch {
    return [];
  }
}

export async function getGenerationJobs(): Promise<GenerationSession[]> {
  try {
    // BE defaults to PageSize=20 if unspecified — this table paginates/filters
    // client-side over the full list, so a small default would silently hide
    // older jobs. Request a generous page size instead of paging server-side.
    const { data } = await apiClient.get<BackendJobListResponse>(
      "/api/hr/question-generation-jobs",
      { params: { PageSize: 200 } }
    );
    let jobs: BackendJob[] = [];
    if (Array.isArray(data)) {
      jobs = data as unknown as BackendJob[];
    } else if (data?.data) {
      const inner = data.data;
      if (Array.isArray(inner)) {
        jobs = inner as unknown as BackendJob[];
      } else if (inner && typeof inner === "object" && "items" in inner) {
        jobs = (inner as { items?: BackendJob[] }).items ?? [];
      }
    } else if (data?.items) {
      jobs = data.items;
    }
    return jobs.map(mapJobToSession);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Plan management
// ---------------------------------------------------------------------------

export async function updateJobPlan(
  jobId: string,
  plan: Partial<PlanDraft> & { roleTitle?: string; totalQuestions?: number; skills?: string[]; notes?: string; level?: string; experienceLevel?: string }
): Promise<boolean> {
  try {
    await apiClient.put(`/api/hr/question-generation-jobs/${jobId}/plan`, plan);
    return true;
  } catch {
    return false;
  }
}

export async function approvePlan(jobId: string): Promise<boolean> {
  try {
    await apiClient.post(`/api/hr/question-generation-jobs/${jobId}/approve-plan`);
    return true;
  } catch {
    return false;
  }
}

export async function retryPlan(jobId: string): Promise<boolean> {
  try {
    await apiClient.post(`/api/hr/question-generation-jobs/${jobId}/retry-plan`);
    return true;
  } catch {
    return false;
  }
}

export async function retryQuestions(jobId: string): Promise<boolean> {
  try {
    await apiClient.post(`/api/hr/question-generation-jobs/${jobId}/retry-questions`);
    return true;
  } catch {
    return false;
  }
}

export async function updateJobInput(
  jobId: string,
  payload: {
    jobDescription?: string;
    hrNote?: string;
    numberOfQuestions?: number;
    difficulty?: string;
    questionTypes?: string[];
    skills?: string[];
  }
): Promise<boolean> {
  try {
    await apiClient.put(`/api/hr/question-generation-jobs/${jobId}/input`, payload);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export async function getJobQuestions(jobId: string): Promise<GeneratedQuestion[]> {
  try {
    const { data } = await apiClient.get<BackendQuestionsResponse>(
      `/api/hr/question-generation-jobs/${jobId}/questions`
    );
    let items: BackendJobQuestion[] = [];
    if (Array.isArray(data)) {
      items = data as unknown as BackendJobQuestion[];
    } else if (data?.data) {
      const inner = data.data;
      if (Array.isArray(inner)) {
        items = inner as unknown as BackendJobQuestion[];
      } else if (inner && typeof inner === "object") {
        // BE returns { data: { jobId, status, questions: [...] } } or { data: { items: [...] } }
        if ("questions" in inner) {
          items = (inner as { questions?: BackendJobQuestion[] }).questions ?? [];
        } else if ("items" in inner) {
          items = (inner as { items?: BackendJobQuestion[] }).items ?? [];
        }
      }
    } else if (data?.items) {
      items = data.items;
    }
    return items
      .map((q, i) => ({
        id: q.id ?? q.questionId ?? `q-${i}`,
        question: q.question,
        questionType: normalizeQuestionType(q.questionType),
        difficulty: normalizeDifficulty(q.difficulty),
        rationale: q.rationale,
        sampleAnswer: q.sampleAnswer,
        citations: [],
        orderIndex: q.order ?? q.orderIndex ?? i,
      }))
      .sort((a, b) => a.orderIndex - b.orderIndex);
  } catch {
    return [];
  }
}

export async function updateJobQuestion(
  jobId: string,
  questionId: string,
  payload: {
    question?: string;
    questionType?: string;
    difficulty?: string;
    rationale?: string | null;
    sampleAnswer?: string | null;
  }
): Promise<boolean> {
  try {
    await apiClient.put(
      `/api/hr/question-generation-jobs/${jobId}/questions/${questionId}`,
      payload
    );
    return true;
  } catch {
    return false;
  }
}

export async function deleteJobQuestion(jobId: string, questionId: string): Promise<boolean> {
  try {
    await apiClient.delete(
      `/api/hr/question-generation-jobs/${jobId}/questions/${questionId}`
    );
    return true;
  } catch {
    return false;
  }
}

export async function addJobQuestion(
  jobId: string,
  payload: {
    question: string;
    questionType?: string;
    difficulty?: string;
    rationale?: string;
    sampleAnswer?: string;
    order?: number;
  }
): Promise<boolean> {
  try {
    await apiClient.post(`/api/hr/question-generation-jobs/${jobId}/questions`, payload);
    return true;
  } catch {
    return false;
  }
}

export async function reorderJobQuestions(
  jobId: string,
  order: { id: string; order: number }[]
): Promise<boolean> {
  try {
    await apiClient.put(`/api/hr/question-generation-jobs/${jobId}/questions/reorder`, {
      items: order.map((o) => ({ questionId: o.id, order: o.order })),
    });
    return true;
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 409) return false; // job already in a state that prevents reorder — not an error
    console.warn("[reorderJobQuestions] failed:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Draft
// ---------------------------------------------------------------------------

export async function saveJobDraft(jobId: string): Promise<string | null> {
  try {
    const { data } = await apiClient.post<SaveDraftResponse>(
      `/api/hr/question-generation-jobs/${jobId}/save-draft`
    );
    return data?.data?.questionSetId ?? null;
  } catch (err) {
    // 409 means already saved — not an error
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 409) return null;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Delete & Export (plans API)
// ---------------------------------------------------------------------------

export async function deleteGenerationPlan(jobId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/api/hr/question-generation-plans/${jobId}`);
    return true;
  } catch (err) {
    // BE rejects (409) once the session has been saved as a draft/question-set —
    // there is currently no API to delete a question-set, so this is permanent
    // for any job with hasDraft=true, not a transient failure.
    throw new Error(extractBeErrorMessage(err));
  }
}

export async function exportPlanQuestions(jobId: string, fileName: string): Promise<void> {
  const { data } = await apiClient.get(
    `/api/hr/question-generation-plans/${jobId}/questions/export`,
    { responseType: "arraybuffer" }
  );
  const blob = new Blob([data as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName.replace(/[^a-z0-9_\- ]/gi, "_")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function getDraft(questionSetId: string): Promise<DraftQuestionSet | null> {
  try {
    const { data } = await apiClient.get<{ data?: DraftQuestionSet } | DraftQuestionSet>(
      `/api/hr/question-sets/${questionSetId}`
    );
    const draft =
      (data as { data?: DraftQuestionSet }).data ?? (data as DraftQuestionSet);
    return draft ?? null;
  } catch {
    return null;
  }
}

export async function getDrafts(): Promise<DraftQuestionSet[]> {
  try {
    const { data } = await apiClient.get<
      | { data?: { items?: DraftQuestionSet[] } | DraftQuestionSet[] }
      | DraftQuestionSet[]
    >("/api/hr/question-sets");
    if (Array.isArray(data)) return data;
    const inner = (data as { data?: unknown }).data;
    if (Array.isArray(inner)) return inner as DraftQuestionSet[];
    if (inner && typeof inner === "object" && "items" in inner) {
      return (inner as { items?: DraftQuestionSet[] }).items ?? [];
    }
    return [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Question-set question CRUD — direct, immediate edits on an already-saved
// question set (as opposed to the job-scoped CRUD above, which only edits the
// generation job's own copy and never touches the saved/published set at all).
// BE rejects all four while the set is PUBLISHED — unpublish first.
// ---------------------------------------------------------------------------

export async function updateQuestionSetQuestion(
  questionSetId: string,
  questionId: string,
  payload: {
    question?: string;
    questionType?: string;
    difficulty?: string;
    rationale?: string | null;
    sampleAnswer?: string | null;
  }
): Promise<boolean> {
  try {
    await apiClient.put(`/api/hr/question-sets/${questionSetId}/questions/${questionId}`, payload);
    return true;
  } catch {
    return false;
  }
}

export async function deleteQuestionSetQuestion(questionSetId: string, questionId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/api/hr/question-sets/${questionSetId}/questions/${questionId}`);
    return true;
  } catch {
    return false;
  }
}

export async function addQuestionSetQuestion(
  questionSetId: string,
  payload: {
    question: string;
    questionType?: string;
    difficulty?: string;
    rationale?: string;
    sampleAnswer?: string;
    order?: number;
  }
): Promise<boolean> {
  try {
    await apiClient.post(`/api/hr/question-sets/${questionSetId}/questions`, payload);
    return true;
  } catch {
    return false;
  }
}

export async function reorderQuestionSetQuestions(
  questionSetId: string,
  items: { id: string; order: number }[]
): Promise<boolean> {
  try {
    await apiClient.put(`/api/hr/question-sets/${questionSetId}/questions/reorder`, {
      items: items.map((i) => ({ questionId: i.id, order: i.order })),
    });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Publish / Unpublish
// ---------------------------------------------------------------------------

export interface HrQuestionSetSummary {
  questionSetId: string;
  jobId?: string;
  status: "DRAFT" | "PUBLISHED";
}

function normalizeQuestionSetSummary(raw: unknown): HrQuestionSetSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, unknown>;
  const questionSetId = [src.questionSetId, src.id, src.QuestionSetId, src.Id]
    .find((v): v is string => typeof v === "string" && v.trim() !== "");
  if (!questionSetId) return null;
  const jobId = [src.jobId, src.sessionId, src.JobId, src.SessionId]
    .find((v): v is string => typeof v === "string" && v.trim() !== "");
  const rawStatus = [src.status, src.Status].find((v): v is string => typeof v === "string");
  return { questionSetId, jobId, status: rawStatus === "PUBLISHED" ? "PUBLISHED" : "DRAFT" };
}

// The job-detail endpoint doesn't expose a questionSetId even when a draft was
// saved (meta.hasDraft is the only signal) — the id only lives in this list,
// keyed by jobId, so publish/unpublish has to cross-reference it here.
export async function findQuestionSetForJob(jobId: string): Promise<HrQuestionSetSummary | null> {
  try {
    const { data } = await apiClient.get<{ data?: unknown } | unknown[]>("/api/hr/question-sets");
    const items = Array.isArray(data) ? data : Array.isArray((data as { data?: unknown })?.data) ? (data as { data: unknown[] }).data : [];
    const normalized = items.map(normalizeQuestionSetSummary).filter((s): s is HrQuestionSetSummary => s !== null);
    return normalized.find((s) => s.jobId === jobId) ?? null;
  } catch {
    return null;
  }
}

/** All jobs' publish status in one call, keyed by jobId — for list views (e.g. HR History) that need it for every row without an N+1 fetch. */
export async function getQuestionSetStatusByJob(): Promise<Map<string, "DRAFT" | "PUBLISHED">> {
  try {
    const { data } = await apiClient.get<{ data?: unknown } | unknown[]>("/api/hr/question-sets");
    const items = Array.isArray(data) ? data : Array.isArray((data as { data?: unknown })?.data) ? (data as { data: unknown[] }).data : [];
    const normalized = items.map(normalizeQuestionSetSummary).filter((s): s is HrQuestionSetSummary => s !== null);
    const map = new Map<string, "DRAFT" | "PUBLISHED">();
    for (const s of normalized) {
      if (s.jobId) map.set(s.jobId, s.status);
    }
    return map;
  } catch {
    return new Map();
  }
}

// BE error responses actually come back as { code, error: "..." } — not the
// { detail }/{ message } shape ASP.NET's default ProblemDetails uses. Reading
// only detail/message meant every real BE rejection (min-questions, ownership,
// "already saved as draft", ...) surfaced as a blank message and silently fell
// back to a generic "failed" toast instead of the actual reason.
function extractBeErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: { error?: string; detail?: string; message?: string } } })
    ?.response?.data;
  return data?.error ?? data?.detail ?? data?.message ?? "";
}

export async function publishQuestionSet(questionSetId: string): Promise<boolean> {
  try {
    await apiClient.post(`/api/hr/question-sets/${questionSetId}/publish`);
    return true;
  } catch (err) {
    // Only surface a BE-provided message; never the raw axios/HTTP error text.
    throw new Error(extractBeErrorMessage(err));
  }
}

export async function unpublishQuestionSet(questionSetId: string): Promise<boolean> {
  try {
    await apiClient.post(`/api/hr/question-sets/${questionSetId}/unpublish`);
    return true;
  } catch (err) {
    throw new Error(extractBeErrorMessage(err));
  }
}

/**
 * Sets (or clears, with null) the candidate practice time limit for a question
 * set — 1–480 minutes. BE rejects this while the set is PUBLISHED (409):
 * unpublish first.
 */
export async function setQuestionSetTimeLimit(
  questionSetId: string,
  timeLimitMinutes: number | null
): Promise<boolean> {
  try {
    await apiClient.put(`/api/hr/question-sets/${questionSetId}/time-limit`, { timeLimitMinutes });
    return true;
  } catch (err) {
    throw new Error(extractBeErrorMessage(err));
  }
}

// ---------------------------------------------------------------------------
// Legacy helpers (used by history detail page / results section)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Question-level Ask AI
// ---------------------------------------------------------------------------

export async function askAIAboutQuestion(
  jobId: string,
  questionId: string,
  prompt: string
): Promise<{ reply: string; suggestion: QuestionSuggestion | null }> {
  const { data } = await apiClient.post(
    `/api/hr/question-generation-jobs/${jobId}/questions/${questionId}/ask-ai`,
    { message: prompt }
  );
  const inner = (data as Record<string, unknown>)?.data ?? data;
  if (typeof inner === "string") return { reply: inner, suggestion: null };
  const obj = inner as Record<string, unknown> | null;
  const text =
    obj?.reply ?? obj?.response ?? obj?.message ?? obj?.content ?? obj?.answer ?? obj?.aiResponse;
  if (typeof text !== "string") throw new Error("Unexpected response format from ask-ai endpoint");

  let suggestion: QuestionSuggestion | null = null;
  const raw = obj?.suggestion;
  if (raw && typeof raw === "object") {
    const s = raw as Record<string, unknown>;
    if (typeof s.question === "string" && s.question.trim()) {
      suggestion = {
        question: s.question.trim(),
        rationale: typeof s.rationale === "string" ? s.rationale : undefined,
        sampleAnswer: typeof s.sampleAnswer === "string" ? s.sampleAnswer : undefined,
        difficulty: typeof s.difficulty === "string" ? s.difficulty : undefined,
        questionType: typeof s.questionType === "string" ? s.questionType : undefined,
      };
    }
  } else if (typeof raw === "string" && raw.trim()) {
    suggestion = { question: raw.trim() };
  }

  return { reply: text, suggestion };
}

export async function getQuestionAIChat(
  jobId: string,
  questionId: string
): Promise<QuestionAIChat[]> {
  const { data } = await apiClient.get(
    `/api/hr/question-generation-jobs/${jobId}/questions/${questionId}/ai-chat`
  );
  const inner = (data as Record<string, unknown>)?.data ?? data;
  if (!Array.isArray(inner)) return [];
  return (inner as Record<string, unknown>[]).map((item) => ({
    id: String(item.id ?? item.Id ?? `${Date.now()}-${Math.random()}`),
    questionId,
    role: (item.role as "ai" | "hr") ?? "ai",
    content: String(item.content ?? item.message ?? item.response ?? ""),
    timestamp: String(item.timestamp ?? item.createdAt ?? new Date().toISOString()),
  }));
}

// ---------------------------------------------------------------------------
// Legacy helpers (used by history detail page / results section)
// ---------------------------------------------------------------------------

export async function saveGenerationResult(
  jobId: string,
  questions: GeneratedQuestion[],
  roleTitle?: string
): Promise<boolean> {
  try {
    if (roleTitle) {
      await apiClient
        .put(`/api/hr/question-generation-jobs/${jobId}/plan`, {
          roleTitle,
          totalQuestions: questions.length,
        })
        .catch(() => {});
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await apiClient
        .post(`/api/hr/question-generation-jobs/${jobId}/questions`, {
          question: q.question,
          questionType: q.questionType,
          difficulty: q.difficulty,
          rationale: q.rationale ?? null,
          sampleAnswer: q.sampleAnswer ?? null,
          order: i,
        })
        .catch(() => {});
    }
    await apiClient.post(`/api/hr/question-generation-jobs/${jobId}/save-draft`);
    return true;
  } catch {
    return false;
  }
}
