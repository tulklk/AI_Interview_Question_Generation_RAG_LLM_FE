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
  evaluationCriteria?: unknown;
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
  isFromStudio?: boolean;
}

interface BackendJobFailure {
  reason?: string;
  stage?: string;
  detail?: string;
}

interface BackendJob {
  id?: string;
  jobId?: string;
  title?: string;
  jobTitle?: string;
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
  isFromStudio?: boolean;
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

/** SCRUM-374: evaluationCriteria (string[] | object[]) → text rubric như Studio. */
function formatScoringRubric(raw?: unknown): string | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "string") {
    const t = raw.trim();
    return t || undefined;
  }
  if (Array.isArray(raw)) {
    const lines = raw
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          if (typeof o.text === "string") return o.text.trim();
          if (typeof o.criterion === "string") return o.criterion.trim();
          if (typeof o.name === "string") return o.name.trim();
        }
        return "";
      })
      .filter(Boolean);
    return lines.length > 0 ? lines.join("\n") : undefined;
  }
  return undefined;
}

function isStudioMirrorNote(hrNote?: string | null): boolean {
  return !!hrNote && hrNote.trim().toUpperCase().startsWith("STUDIO_MIRROR");
}

function mapBackendQuestion(q: BackendJobQuestion, i: number): GeneratedQuestion {
  return {
    id: q.id ?? q.questionId ?? `q-${i}`,
    question: q.question,
    questionType: normalizeQuestionType(q.questionType),
    difficulty: normalizeDifficulty(q.difficulty),
    rationale: q.rationale,
    sampleAnswer: q.sampleAnswer,
    scoringRubric: formatScoringRubric(q.evaluationCriteria),
    citations: [],
    orderIndex: q.order ?? q.orderIndex ?? i,
  };
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
  const role = job.title ?? job.jobTitle ?? job.plan?.roleTitle ?? summ?.role ?? "";
  const id = job.jobId ?? job.id ?? "";
  const ui = job.ui;
  const meta = job.meta;

  return {
    id,
    jobTitle: role || "Interview Questions",
    jdContent:
      job.jobDescription ??
      job.jobDescriptionPreview ??
      (job.input as { jobDescription?: string; jobDescriptionPreview?: string } | undefined)?.jobDescription ??
      (job.input as { jobDescription?: string; jobDescriptionPreview?: string } | undefined)?.jobDescriptionPreview,
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
      ? job.questions.map((q, i) => mapBackendQuestion(q, i))
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
    isFromStudio:
      meta?.isFromStudio ??
      job.isFromStudio ??
      isStudioMirrorNote(
        job.hrNote ??
          (typeof job.input?.hrNote === "string" ? job.input.hrNote : undefined)
      ),
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

function buildJobInputFormData(payload: {
  jobDescription?: string;
  hrNote?: string;
  numberOfQuestions?: number;
  difficulty?: string;
  questionTypes?: string[];
  skills?: string[];
  file: File;
}): FormData {
  const form = new FormData();
  if (payload.jobDescription) form.append("JobDescription", payload.jobDescription);
  if (payload.hrNote) form.append("HrNote", payload.hrNote);
  if (payload.numberOfQuestions !== undefined) form.append("NumberOfQuestions", String(payload.numberOfQuestions));
  if (payload.difficulty) form.append("Difficulty", payload.difficulty);
  if (payload.questionTypes?.length) form.append("QuestionTypes", payload.questionTypes.join(","));
  if (payload.skills?.length) form.append("Skills", payload.skills.join(","));
  form.append("File", payload.file);
  return form;
}

/** Same as createGenerationJob, but lets the HR attach a JD file (PDF/DOC/DOCX) instead of/alongside pasted text. */
export async function createGenerationJobFromFile(payload: {
  jobDescription?: string;
  hrNote?: string;
  numberOfQuestions?: number;
  difficulty?: string;
  questionTypes?: string[];
  skills?: string[];
  file: File;
}): Promise<string | null> {
  try {
    const { data } = await apiClient.post<CreateJobResponseData>(
      "/api/hr/question-generation-jobs/plan/upload",
      buildJobInputFormData(payload),
      { headers: { "Content-Type": "multipart/form-data" } }
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

// Several pages (AppShell notifications, History table/stats, HR dashboard)
// independently call getGenerationJobs() and often mount within moments of
// each other during navigation — cache briefly and de-dupe concurrent calls
// so they share one network round-trip instead of firing one each.
const GENERATION_JOBS_TTL_MS = 15000;
let generationJobsCache: { data: GenerationSession[]; ts: number } | null = null;
let generationJobsInFlight: Promise<GenerationSession[]> | null = null;

export function invalidateGenerationJobsCache(): void {
  generationJobsCache = null;
}

if (typeof window !== "undefined") {
  window.addEventListener("hr:bg-job-updated", invalidateGenerationJobsCache);
  window.addEventListener("hr:job-status-changed", invalidateGenerationJobsCache);
}

export async function getGenerationJobs(): Promise<GenerationSession[]> {
  if (generationJobsCache && Date.now() - generationJobsCache.ts < GENERATION_JOBS_TTL_MS) {
    return generationJobsCache.data;
  }
  if (generationJobsInFlight) return generationJobsInFlight;

  generationJobsInFlight = fetchGenerationJobs().finally(() => {
    generationJobsInFlight = null;
  });
  return generationJobsInFlight;
}

async function fetchGenerationJobs(): Promise<GenerationSession[]> {
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
    const sessions = jobs.map(mapJobToSession);
    generationJobsCache = { data: sessions, ts: Date.now() };
    return sessions;
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

/** Same as updateJobInput, but lets the HR attach a replacement JD file instead of/alongside pasted text. */
export async function updateJobInputFromFile(
  jobId: string,
  payload: {
    jobDescription?: string;
    hrNote?: string;
    numberOfQuestions?: number;
    difficulty?: string;
    questionTypes?: string[];
    skills?: string[];
    file: File;
  }
): Promise<boolean> {
  try {
    await apiClient.put(
      `/api/hr/question-generation-jobs/${jobId}/input/upload`,
      buildJobInputFormData(payload),
      { headers: { "Content-Type": "multipart/form-data" } }
    );
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
      .map((q, i) => mapBackendQuestion(q, i))
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
    scoringRubric?: string | null;
  }
): Promise<boolean> {
  try {
    const body: Record<string, unknown> = { ...payload };
    if ("scoringRubric" in payload) {
      const rubric = payload.scoringRubric?.trim();
      body.evaluationCriteria = rubric
        ? rubric.split(/\n+/).map((s) => s.trim()).filter(Boolean)
        : [];
      delete body.scoringRubric;
    }
    await apiClient.put(
      `/api/hr/question-generation-jobs/${jobId}/questions/${questionId}`,
      body
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
    invalidateGenerationJobsCache();
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

// BE's single-question-set GET uses its own field names (questionSetId, title,
// sourceJobId, lowercase questionType/difficulty, "order") rather than the
// GeneratedQuestion/DraftQuestionSet shape — normalize instead of raw-casting.
function normalizeAnswerMethod(raw: unknown): "Text" | "Code" | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const key = raw.trim().toLowerCase();
  if (key === "code" || key === "coding") return "Code";
  if (key === "text" || key === "theory" || key === "essay") return "Text";
  return undefined;
}

function normalizeDraftQuestion(raw: unknown, index: number): GeneratedQuestion | null {
  const src = raw as Record<string, unknown> | null;
  if (!src || typeof src !== "object") return null;
  const question = typeof src.question === "string" ? src.question : "";
  if (!question) return null;
  const skillRaw = src.skill ?? src.Skill;
  const focusRaw = src.focusArea ?? src.FocusArea;
  return {
    id: (typeof src.id === "string" && src.id) || `q-${index}`,
    question,
    questionType: normalizeQuestionType(typeof src.questionType === "string" ? src.questionType : undefined),
    difficulty: normalizeDifficulty(typeof src.difficulty === "string" ? src.difficulty : undefined),
    skill: typeof skillRaw === "string" && skillRaw.trim() ? skillRaw.trim() : undefined,
    focusArea: typeof focusRaw === "string" && focusRaw.trim() ? focusRaw.trim() : undefined,
    rationale: typeof src.rationale === "string" ? src.rationale : undefined,
    sampleAnswer: typeof src.sampleAnswer === "string" ? src.sampleAnswer : undefined,
    scoringRubric: formatScoringRubric(src.evaluationCriteria),
    attachedImageUrl:
      (typeof src.attachedImageUrl === "string" && src.attachedImageUrl.trim())
        ? src.attachedImageUrl.trim()
        : (typeof src.AttachedImageUrl === "string" && src.AttachedImageUrl.trim())
          ? src.AttachedImageUrl.trim()
          : null,
    answerMethod: normalizeAnswerMethod(src.answerMethod ?? src.AnswerMethod),
    citations: [],
    orderIndex: typeof src.order === "number" ? src.order : typeof src.orderIndex === "number" ? src.orderIndex : index,
  };
}

function normalizeDraft(raw: unknown): DraftQuestionSet | null {
  const src = raw as Record<string, unknown> | null;
  if (!src || typeof src !== "object") return null;
  const id = [src.questionSetId, src.id].find((v): v is string => typeof v === "string" && v.trim() !== "");
  if (!id) return null;
  const sessionId = [src.sourceJobId, src.jobId, src.sessionId].find((v): v is string => typeof v === "string" && v.trim() !== "");
  const jobTitle = [src.title, src.jobTitle].find((v): v is string => typeof v === "string" && v.trim() !== "");
  const status = src.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const questions = Array.isArray(src.questions)
    ? src.questions.map((q, i) => normalizeDraftQuestion(q, i)).filter((q): q is GeneratedQuestion => q !== null)
    : [];
  return {
    id,
    sessionId: sessionId ?? "",
    jobTitle: jobTitle ?? "Untitled",
    generatedAt: typeof src.generatedAt === "string" ? src.generatedAt : "",
    status,
    timeLimitMinutes: typeof src.timeLimitMinutes === "number" ? src.timeLimitMinutes : null,
    questions,
  };
}

export async function getDraft(questionSetId: string): Promise<DraftQuestionSet | null> {
  try {
    const { data } = await apiClient.get<{ data?: unknown } | unknown>(
      `/api/hr/question-sets/${questionSetId}`
    );
    const root = (data as { data?: unknown })?.data ?? data;
    return normalizeDraft(root);
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
    skill?: string | null;
    focusArea?: string | null;
    rationale?: string | null;
    sampleAnswer?: string | null;
    scoringRubric?: string | null;
    /** SCRUM-400: bắt buộc Text | Code khi update. */
    answerMethod?: "Text" | "Code";
  }
): Promise<boolean> {
  try {
    const body: Record<string, unknown> = {
      question: payload.question,
      questionType: payload.questionType,
      difficulty: payload.difficulty,
      skill: payload.skill,
      focusArea: payload.focusArea,
      rationale: payload.rationale,
      sampleAnswer: payload.sampleAnswer,
      answerMethod: payload.answerMethod,
    };
    if ("scoringRubric" in payload) {
      const rubric = payload.scoringRubric?.trim();
      body.evaluationCriteria = rubric
        ? rubric.split(/\n+/).map((s) => s.trim()).filter(Boolean)
        : [];
    }
    await apiClient.put(`/api/hr/question-sets/${questionSetId}/questions/${questionId}`, body);
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

/** SCRUM-396: upload ảnh đính kèm câu hỏi Question Set (History). */
export async function uploadQuestionSetQuestionImage(
  questionSetId: string,
  questionId: string,
  file: File
): Promise<GeneratedQuestion | null> {
  try {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post<{ data?: unknown } | unknown>(
      `/api/hr/question-sets/${questionSetId}/questions/${questionId}/image`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    const root = (data as { data?: unknown })?.data ?? data;
    return normalizeDraftQuestion(root, 0);
  } catch {
    return null;
  }
}

/** SCRUM-396: xóa ảnh đính kèm câu hỏi Question Set. */
export async function deleteQuestionSetQuestionImage(
  questionSetId: string,
  questionId: string
): Promise<GeneratedQuestion | null> {
  try {
    const { data } = await apiClient.delete<{ data?: unknown } | unknown>(
      `/api/hr/question-sets/${questionSetId}/questions/${questionId}/image`
    );
    const root = (data as { data?: unknown })?.data ?? data;
    return normalizeDraftQuestion(root, 0);
  } catch {
    return null;
  }
}

/** SCRUM-397: tạo DRAFT rỗng từ Question Builder (title bắt buộc). */
export async function createManualDraftQuestionSet(payload: {
  title: string;
  description?: string;
}): Promise<{ questionSetId: string; title: string; status: "DRAFT" | "PUBLISHED"; questionCount: number }> {
  try {
    const { data } = await apiClient.post<{ data?: unknown } | unknown>(
      "/api/hr/question-sets",
      {
        title: payload.title.trim(),
        description: payload.description?.trim() || undefined,
      }
    );
    const rootRaw = (data as { data?: unknown })?.data ?? data;
    const root =
      rootRaw && typeof rootRaw === "object"
        ? (rootRaw as Record<string, unknown>)
        : null;
    if (!root) {
      throw new Error("Phản hồi tạo bộ câu hỏi không hợp lệ.");
    }
    const idRaw = root.questionSetId ?? root.QuestionSetId ?? root.id ?? root.Id;
    const questionSetId =
      typeof idRaw === "string"
        ? idRaw
        : idRaw != null
          ? String(idRaw)
          : "";
    if (!questionSetId) {
      throw new Error("BE không trả về questionSetId.");
    }
    const statusRaw = typeof root.status === "string" ? root.status.toUpperCase() : "DRAFT";
    return {
      questionSetId,
      title: payload.title.trim(),
      status: statusRaw === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      questionCount: typeof root.questionCount === "number" ? root.questionCount : 0,
    };
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const beMsg = extractBeErrorMessage(err);
    if (status === 405 || status === 404) {
      throw new Error(
        beMsg ||
          "API tạo bộ DRAFT chưa có trên server đang dùng (cần deploy BE có POST /api/hr/question-sets). Hoặc chạy BE local và trỏ NEXT_PUBLIC_API_BASE_URL về localhost."
      );
    }
    throw new Error(beMsg || "Không tạo được bộ câu hỏi. Vui lòng thử lại.");
  }
}

/**
 * SCRUM-397 / v3: thêm câu hỏi vào bộ — trả về question đã tạo (có id) để upload ảnh tiếp.
 * Payload đủ field như Studio Save (skill, focusArea, evaluationCriteria, sampleAnswer riêng).
 */
export async function addQuestionSetQuestion(
  questionSetId: string,
  payload: {
    question: string;
    questionType?: string;
    difficulty?: string;
    skill?: string;
    focusArea?: string;
    rationale?: string;
    sampleAnswer?: string;
    /** SCRUM-400: bắt buộc Text | Code. */
    answerMethod: "Text" | "Code";
    /** Rubric — mỗi phần tử 1 tiêu chí (BE serialize EvaluationCriteriaJson). */
    evaluationCriteria?: string[];
    citations?: unknown[];
    order?: number;
  }
): Promise<GeneratedQuestion | null> {
  try {
    const body: Record<string, unknown> = {
      question: payload.question,
      questionType: payload.questionType,
      difficulty: payload.difficulty,
      skill: payload.skill,
      focusArea: payload.focusArea,
      rationale: payload.rationale,
      sampleAnswer: payload.sampleAnswer,
      answerMethod: payload.answerMethod,
      order: payload.order,
      evaluationCriteria: payload.evaluationCriteria ?? [],
      citations: payload.citations ?? [],
    };
    const { data } = await apiClient.post<{ data?: unknown } | unknown>(
      `/api/hr/question-sets/${questionSetId}/questions`,
      body
    );
    const root = (data as { data?: unknown })?.data ?? data;
    return normalizeDraftQuestion(root, 0);
  } catch {
    return null;
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

/** All jobs' question-set summary (id + publish status) in one call, keyed by
 * jobId — the job list endpoint never includes questionSetId (only the
 * single-job GET does), so list views (e.g. HR History) that need it for
 * every row — to link/bookmark, or show publish status — cross-reference here
 * instead of doing an N+1 fetch, or worse, two separate full-list fetches. */
export async function getQuestionSetSummariesByJob(): Promise<Map<string, HrQuestionSetSummary>> {
  try {
    const { data } = await apiClient.get<{ data?: unknown } | unknown[]>("/api/hr/question-sets");
    const items = Array.isArray(data) ? data : Array.isArray((data as { data?: unknown })?.data) ? (data as { data: unknown[] }).data : [];
    const normalized = items.map(normalizeQuestionSetSummary).filter((s): s is HrQuestionSetSummary => s !== null);
    const map = new Map<string, HrQuestionSetSummary>();
    for (const s of normalized) {
      if (s.jobId) map.set(s.jobId, s);
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

export async function unpublishQuestionSet(questionSetId: string): Promise<number> {
  try {
    const { data } = await apiClient.post<unknown>(`/api/hr/question-sets/${questionSetId}/unpublish`);
    return parseAbandonedSessionCount(data);
  } catch (err) {
    throw new Error(extractBeErrorMessage(err));
  }
}

export function parseAbandonedSessionCount(raw: unknown): number {
  const rec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const inner = rec.data && typeof rec.data === "object" ? (rec.data as Record<string, unknown>) : rec;
  const n = Number(inner.abandonedSessionCount ?? inner.AbandonedSessionCount ?? 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function withAbandonedToast(base: string, count: number): string {
  if (count <= 0) return base;
  return `${base} Đã hủy ${count} phiên đang làm.`;
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

export async function renameQuestionSetTitle(questionSetId: string, title: string): Promise<string> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Tiêu đề không được để trống.");
  try {
    const { data } = await apiClient.put<{ data?: { title?: string }; title?: string }>(
      `/api/hr/question-sets/${questionSetId}/title`,
      { title: trimmed }
    );
    const root = (data as { data?: { title?: string } })?.data ?? data;
    const saved =
      root && typeof root === "object" && typeof (root as { title?: string }).title === "string"
        ? (root as { title: string }).title.trim()
        : trimmed;
    return saved || trimmed;
  } catch (err) {
    throw new Error(extractBeErrorMessage(err) || "Không thể cập nhật tên.");
  }
}

// ---------------------------------------------------------------------------
// HR bookmarks — save favorite question sets for quick access later.
// ---------------------------------------------------------------------------

export interface HrBookmarkedSet {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED";
  questionsCount: number;
  createdAt: string | null;
  companyName: string;
  companyLogoUrl: string | null;
  /** Originating generation job id, if the BE includes it — lets the card deep-link to the review page. */
  sessionId?: string;
}

function asRecord(val: unknown): Record<string, unknown> | null {
  return val && typeof val === "object" ? (val as Record<string, unknown>) : null;
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
  }
  return 0;
}

function normalizeHrBookmarkedSet(raw: unknown): HrBookmarkedSet | null {
  const src = asRecord(raw);
  if (!src) return null;
  const id = pickStr(src, "id", "questionSetId");
  if (!id) return null;
  const status = pickStr(src, "status").toUpperCase();
  return {
    id,
    title: pickStr(src, "title", "jobTitle", "name") || "Untitled",
    status: status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    questionsCount: pickNum(src, "questionsCount", "totalQuestions", "questionCount"),
    createdAt: pickStr(src, "createdAt", "savedAt", "generatedAt") || null,
    companyName: pickStr(src, "companyName", "company"),
    companyLogoUrl: pickStr(src, "companyLogo", "companyLogoUrl") || null,
    sessionId: pickStr(src, "sessionId", "jobId") || undefined,
  };
}

function extractItemList(raw: unknown): unknown[] {
  const root = asRecord(raw);
  if (!root) return Array.isArray(raw) ? raw : [];
  const data = asRecord(root.data) ?? root;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items as unknown[];
  return [];
}

/** Toggles the bookmark on an HR question set and returns the new state. */
export async function toggleHrBookmark(questionSetId: string): Promise<boolean> {
  const res = await apiClient.post(`/api/hr/question-sets/${questionSetId}/bookmark`);
  const root = asRecord(res.data);
  const data = root ? asRecord(root.data) : null;
  return (data ?? root)?.bookmarked === true;
}

/** Ids of all question sets the HR has bookmarked — for cross-referencing row state. */
export async function getHrBookmarkedSetIds(): Promise<Set<string>> {
  try {
    const res = await apiClient.get("/api/hr/bookmarks");
    const ids = extractItemList(res.data)
      .map((raw) => asRecord(raw))
      .filter((r): r is Record<string, unknown> => r !== null)
      .map((r) => pickStr(r, "id", "questionSetId"))
      .filter((id) => id !== "");
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export async function listHrBookmarks(): Promise<HrBookmarkedSet[]> {
  const res = await apiClient.get("/api/hr/bookmarks");
  return extractItemList(res.data)
    .map(normalizeHrBookmarkedSet)
    .filter((s): s is HrBookmarkedSet => s !== null);
}

// ---------------------------------------------------------------------------
// Practitioners — candidates who have practiced a given HR question set.
// ---------------------------------------------------------------------------

export type PractitionerSessionStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED";

export interface Practitioner {
  id: string;
  sessionId: string;
  candidateUserId: string;
  candidateName: string;
  candidateEmail: string;
  score: number | null;
  status: PractitionerSessionStatus;
  completedAt: string | null;
  startedAt: string | null;
}

function normalizePractitionerStatus(raw: string): PractitionerSessionStatus {
  const u = raw.toUpperCase();
  return u === "COMPLETED" || u === "ABANDONED" ? u : "IN_PROGRESS";
}

function normalizePractitioner(raw: unknown, index: number): Practitioner | null {
  const src = asRecord(raw);
  if (!src) return null;
  const candidateUserId = pickStr(src, "candidateUserId", "CandidateUserId");
  if (!candidateUserId) return null;
  const sessionId = pickStr(src, "sessionId", "SessionId");
  const startedAt = typeof src.startedAt === "string" ? src.startedAt : pickStr(src, "startedAt", "StartedAt") || null;
  const scoreRaw = src.score ?? src.overallScore ?? src.OverallScore;
  return {
    id: sessionId || `${candidateUserId}-${startedAt || index}`,
    sessionId,
    candidateUserId,
    candidateName: pickStr(src, "candidateName", "CandidateName", "fullName", "name"),
    candidateEmail: pickStr(src, "candidateEmail", "CandidateEmail", "email"),
    score: typeof scoreRaw === "number" ? scoreRaw : null,
    status: normalizePractitionerStatus(pickStr(src, "status", "Status") || "IN_PROGRESS"),
    completedAt: typeof src.completedAt === "string" ? src.completedAt : pickStr(src, "completedAt", "CompletedAt") || null,
    startedAt,
  };
}

export async function getPractitioners(questionSetId: string): Promise<Practitioner[]> {
  const res = await apiClient.get(`/api/hr/question-sets/${questionSetId}/practitioners`);
  return extractItemList(res.data)
    .map((raw, i) => normalizePractitioner(raw, i))
    .filter((p): p is Practitioner => p !== null);
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
  prompt: string,
  currentQuestion?: {
    question: string;
    questionType: string;
    difficulty: string;
    skill?: string;
    focusArea?: string;
    rationale?: string;
    sampleAnswer?: string;
  }
): Promise<{ reply: string; suggestion: QuestionSuggestion | null }> {
  const { data } = await apiClient.post(
    `/api/hr/question-generation-jobs/${jobId}/questions/${questionId}/ask-ai`,
    {
      message: prompt,
      ...(currentQuestion && {
        currentQuestion: {
          question: currentQuestion.question,
          questionType: currentQuestion.questionType,
          difficulty: currentQuestion.difficulty,
          skill: currentQuestion.skill ?? "",
          focusArea: currentQuestion.focusArea ?? "",
          rationale: currentQuestion.rationale ?? "",
          sampleAnswer: currentQuestion.sampleAnswer ?? "",
        },
      }),
    }
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
  const arr = Array.isArray(inner)
    ? inner
    : Array.isArray((inner as Record<string, unknown>)?.messages)
    ? ((inner as Record<string, unknown>).messages as Record<string, unknown>[])
    : null;
  if (!arr) return [];
  return arr.map((item) => ({
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
