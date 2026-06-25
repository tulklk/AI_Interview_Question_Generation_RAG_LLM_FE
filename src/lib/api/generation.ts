import { apiClient } from "@/lib/api-client";
import type {
  GenerationSession,
  GenerationStatus,
  GeneratedQuestion,
  QuestionType,
  DifficultyLevel,
  PlanDraft,
  DraftQuestionSet,
} from "@/types/generation-session";

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
  question: string;
  questionType?: string;
  difficulty?: string;
  rationale?: string;
  sampleAnswer?: string;
  order?: number;
}

interface BackendJobPlan {
  roleTitle?: string;
  summary?: string;
  difficulty?: string;
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
  const role = job.plan?.roleTitle ?? "";
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
      level: "",
      questionCount:
        job.numberOfQuestions ??
        job.plan?.totalQuestions ??
        job.questionCount ??
        (job.questions?.length ?? 0),
      questionTypes: (job.questionTypes ?? ["Technical"]).map(normalizeQuestionType),
      topics: job.plan?.skills ?? job.skills ?? [],
      summary: job.plan?.summary,
    },
    generatedQuestions: job.questions?.length
      ? job.questions.map((q, i) => ({
          id: q.id ?? `q-${i}`,
          question: q.question,
          questionType: normalizeQuestionType(q.questionType),
          difficulty: normalizeDifficulty(q.difficulty),
          rationale: q.rationale,
          sampleAnswer: q.sampleAnswer,
          citations: [],
          orderIndex: q.order ?? i,
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
  } catch {
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
      level: p.level ? (p.level.charAt(0).toUpperCase() + p.level.slice(1)) : "",
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
    const { data } = await apiClient.get<BackendJobListResponse>(
      "/api/hr/question-generation-jobs"
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

export async function getGenerationSession(id: string): Promise<GenerationSession> {
  const { data } = await apiClient.get<GenerationSession>(
    `/api/v1/hr/generation-sessions/${id}`
  );
  return data;
}

// ---------------------------------------------------------------------------
// Plan management
// ---------------------------------------------------------------------------

export async function updateJobPlan(
  jobId: string,
  plan: Partial<PlanDraft> & { roleTitle?: string; totalQuestions?: number; skills?: string[]; notes?: string }
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
    return items.map((q, i) => ({
      id: q.id ?? `q-${i}`,
      question: q.question,
      questionType: normalizeQuestionType(q.questionType),
      difficulty: normalizeDifficulty(q.difficulty),
      rationale: q.rationale,
      sampleAnswer: q.sampleAnswer,
      citations: [],
      orderIndex: q.order ?? i,
    }));
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
      questions: order,
    });
    return true;
  } catch {
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
  } catch {
    return false;
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
