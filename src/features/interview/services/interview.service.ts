import { apiClient } from "@/core/api/http-client";
import type {
  GeneratedQuestion,
  QuestionType,
  DifficultyLevel,
  DraftQuestionSet,
  QuestionAIChat,
  QuestionSuggestion,
  Citation,
} from "@/features/interview/types/generation-session";
import { normalizeFromJson, normalizeFromUnknown, toDisplayText, isPublishReady } from "@/shared/rubric";

// ---------------------------------------------------------------------------
// Normalizers (Question Set / History)
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

/** SCRUM-374 / SCRUM-418: evaluationCriteria → text rubric hoặc RubricV1. */
function formatScoringRubric(raw?: unknown): string | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return undefined;
    if (t.startsWith("{")) {
      const doc = normalizeFromJson(t);
      return toDisplayText(doc) || undefined;
    }
    return t;
  }
  const doc = normalizeFromUnknown(raw);
  const text = toDisplayText(doc);
  return text || undefined;
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

/** Map citations BE/Studio → Citation (sourceFile + origin/usedFor…). */
function normalizeCitation(raw: unknown): Citation | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, unknown>;
  // pickStr (defined below, near asRecord) returns "" on no match — fine here
  // since sourceFile already falls back to "" either way.
  const sourceFile = pickStr(src, "sourceFile", "SourceFile", "source", "Source");
  if (!sourceFile && !src.reason && !src.excerpt) return null;

  const usedForRaw = src.usedFor ?? src.UsedFor;
  const usedFor = Array.isArray(usedForRaw)
    ? usedForRaw.filter((x): x is string => typeof x === "string" && x.trim() !== "")
    : null;

  const chunkRaw = src.chunkIndex ?? src.ChunkIndex;
  const chunkIndex =
    typeof chunkRaw === "number" && Number.isFinite(chunkRaw) ? chunkRaw : null;

  const originRaw = src.origin ?? src.Origin;
  const origin = typeof originRaw === "string" && originRaw.trim() ? originRaw.trim() : null;

  const excerptRaw = src.excerpt ?? src.Excerpt;
  const excerpt = typeof excerptRaw === "string" ? excerptRaw : null;

  const kbRaw = src.knowledgeBase ?? src.KnowledgeBase;
  const knowledgeBase = typeof kbRaw === "string" ? kbRaw : null;

  const reasonRaw = src.reason ?? src.Reason;
  const reason = typeof reasonRaw === "string" ? reasonRaw : null;

  const urlRaw = src.url ?? src.Url;
  const url = typeof urlRaw === "string" ? urlRaw : undefined;

  return {
    sourceFile: sourceFile || "unknown",
    source: sourceFile || "unknown",
    chunkIndex,
    excerpt,
    knowledgeBase,
    origin,
    usedFor,
    reason,
    url,
  };
}

function normalizeCitations(raw: unknown): Citation[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeCitation).filter((c): c is Citation => c !== null);
}

function normalizeDraftQuestion(raw: unknown, index: number): GeneratedQuestion | null {
  const src = raw as Record<string, unknown> | null;
  if (!src || typeof src !== "object") return null;
  const question =
    (typeof src.question === "string" && src.question) ||
    (typeof src.Question === "string" && src.Question) ||
    (typeof src.content === "string" && src.content) ||
    "";
  if (!question) return null;
  const skillRaw = src.skill ?? src.Skill;
  const focusRaw = src.focusArea ?? src.FocusArea;
  const evalRaw = src.evaluationCriteria ?? src.EvaluationCriteria;
  const sampleAnswer =
    typeof src.sampleAnswer === "string"
      ? src.sampleAnswer
      : typeof src.SampleAnswer === "string"
        ? src.SampleAnswer
        : undefined;
  const rubricDoc =
    typeof evalRaw === "string" && evalRaw.trim().startsWith("{")
      ? normalizeFromJson(evalRaw)
      : normalizeFromUnknown(evalRaw);
  const isActiveRaw = src.isActive ?? src.IsActive;
  return {
    id: (typeof src.id === "string" && src.id) || (typeof src.Id === "string" && src.Id) || `q-${index}`,
    question,
    questionType: normalizeQuestionType(
      typeof src.questionType === "string"
        ? src.questionType
        : typeof src.QuestionType === "string"
          ? src.QuestionType
          : undefined
    ),
    difficulty: normalizeDifficulty(
      typeof src.difficulty === "string"
        ? src.difficulty
        : typeof src.Difficulty === "string"
          ? src.Difficulty
          : undefined
    ),
    skill: typeof skillRaw === "string" && skillRaw.trim() ? skillRaw.trim() : undefined,
    focusArea: typeof focusRaw === "string" && focusRaw.trim() ? focusRaw.trim() : undefined,
    rationale:
      typeof src.rationale === "string"
        ? src.rationale
        : typeof src.Rationale === "string"
          ? src.Rationale
          : undefined,
    sampleAnswer,
    scoringRubric: formatScoringRubric(evalRaw),
    attachedImageUrl:
      (typeof src.attachedImageUrl === "string" && src.attachedImageUrl.trim())
        ? src.attachedImageUrl.trim()
        : (typeof src.AttachedImageUrl === "string" && src.AttachedImageUrl.trim())
          ? src.AttachedImageUrl.trim()
          : null,
    answerMethod: normalizeAnswerMethod(src.answerMethod ?? src.AnswerMethod),
    citations: normalizeCitations(src.citations ?? src.Citations),
    orderIndex:
      typeof src.order === "number"
        ? src.order
        : typeof src.Order === "number"
          ? src.Order
          : typeof src.orderIndex === "number"
            ? src.orderIndex
            : index,
    isActive: typeof isActiveRaw === "boolean" ? isActiveRaw : true,
    isReady: Boolean(sampleAnswer?.trim() && isPublishReady(rubricDoc)),
  };
}

function normalizeDraft(raw: unknown): DraftQuestionSet | null {
  const src = raw as Record<string, unknown> | null;
  if (!src || typeof src !== "object") return null;
  const id = pickStr(src, "questionSetId", "QuestionSetId", "id", "Id");
  if (!id) return null;
  const sessionId = pickStr(src, "sourceJobId", "SourceJobId", "jobId", "JobId", "sessionId");
  const jobTitle = pickStr(src, "title", "Title", "jobTitle", "JobTitle");
  const jdRaw = [src.jobDescription, src.JobDescription].find(
    (v): v is string => typeof v === "string"
  );
  const jobDescription = jdRaw?.trim() ? jdRaw.trim() : undefined;
  const jdSourceRaw = String(src.jdSourceType ?? src.JdSourceType ?? "").trim();
  const jdSourceType: "PastedText" | "UploadedFile" =
    jdSourceRaw.toLowerCase() === "uploadedfile" ? "UploadedFile" : "PastedText";
  const jdFileRaw = pickStr(src, "jdOriginalFileName", "JdOriginalFileName");
  const sourceProjectRaw = pickStr(src, "sourceProjectId", "SourceProjectId");
  const statusRaw = String(src.status ?? src.Status ?? "").toUpperCase();
  const status = statusRaw === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const questionsRaw = src.questions ?? src.Questions;
  const questions = Array.isArray(questionsRaw)
    ? questionsRaw.map((q, i) => normalizeDraftQuestion(q, i)).filter((q): q is GeneratedQuestion => q !== null)
    : [];
  return {
    id,
    sessionId,
    jobTitle: jobTitle || "Untitled",
    jobDescription,
    jdSourceType,
    jdOriginalFileName: jdFileRaw || null,
    sourceProjectId: sourceProjectRaw || null,
    generatedAt:
      typeof src.generatedAt === "string"
        ? src.generatedAt
        : typeof src.GeneratedAt === "string"
          ? src.GeneratedAt
          : "",
    status,
    timeLimitMinutes:
      typeof src.timeLimitMinutes === "number"
        ? src.timeLimitMinutes
        : typeof src.TimeLimitMinutes === "number"
          ? src.TimeLimitMinutes
          : null,
    autoRecommendEnabled:
      typeof src.autoRecommendEnabled === "boolean"
        ? src.autoRecommendEnabled
        : typeof src.AutoRecommendEnabled === "boolean"
          ? src.AutoRecommendEnabled
          : true,
    recommendationMinScore:
      typeof src.recommendationMinScore === "number"
        ? src.recommendationMinScore
        : typeof src.RecommendationMinScore === "number"
          ? src.RecommendationMinScore
          : 70,
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
  } catch (err) {
    // Giữ null để UI hiện not-found; log để phân biệt 404 vs 500 (rubric parse…)
    if (typeof console !== "undefined") {
      const status = (err as { response?: { status?: number } })?.response?.status;
      console.warn("[getDraft] failed", questionSetId, status ?? err);
    }
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
// Question-set question CRUD. BE rejects edits while the set is PUBLISHED — unpublish first.
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
      // Reuse the same parser as the create path (addQuestionSetQuestion) instead
      // of naively splitting lines — that dropped the "[NN%] " weight prefix into
      // the label text, corrupting the rubric further on every subsequent edit.
      body.evaluationCriteria = rubric ? normalizeFromUnknown(rubric).criteria : [];
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
    evaluationCriteria?: unknown[];
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

function extractBeErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: { error?: string; detail?: string; message?: string } } })
    ?.response?.data;
  return data?.error ?? data?.detail ?? data?.message ?? "";
}

export type PublishQuestionSetPayload = {
  questionIds?: string[];
  timeLimitMinutes?: number | null;
  autoRecommendEnabled?: boolean;
  recommendationMinScore?: number;
};

/** SCRUM-439: publish selective + time limit + recommend settings. */
export async function publishQuestionSet(
  questionSetId: string,
  payload?: PublishQuestionSetPayload
): Promise<boolean> {
  try {
    await apiClient.post(`/api/hr/question-sets/${questionSetId}/publish`, {
      questionIds: payload?.questionIds ?? null,
      timeLimitMinutes: payload?.timeLimitMinutes ?? null,
      autoRecommendEnabled: payload?.autoRecommendEnabled ?? null,
      recommendationMinScore: payload?.recommendationMinScore ?? null,
    });
    return true;
  } catch (err) {
    // Only surface a BE-provided message; never the raw axios/HTTP error text.
    throw new Error(extractBeErrorMessage(err));
  }
}

/** SCRUM-438: tổng hợp set PUBLISHED (practice + rating). */
export type PublishedOverviewItem = {
  questionSetId: string;
  title: string;
  publishedAt: string | null;
  questionCount: number;
  timeLimitMinutes: number | null;
  attemptCount: number;
  completedCount: number;
  inProgressCount: number;
  averageScore: number | null;
  averageRating: number | null;
  feedbackCount: number;
};

export async function getPublishedOverview(): Promise<PublishedOverviewItem[]> {
  const { data } = await apiClient.get<{ data?: unknown } | unknown>(
    "/api/hr/question-sets/published-overview"
  );
  const root = (data as { data?: unknown })?.data ?? data;
  const arr = Array.isArray(root) ? root : [];
  return arr
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const src = raw as Record<string, unknown>;
      const id =
        (typeof src.questionSetId === "string" && src.questionSetId) ||
        (typeof src.QuestionSetId === "string" && src.QuestionSetId) ||
        "";
      if (!id) return null;
      const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
      const int = (v: unknown) => {
        const n = typeof v === "number" ? v : Number(v);
        return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
      };
      return {
        questionSetId: id,
        title:
          (typeof src.title === "string" && src.title) ||
          (typeof src.Title === "string" && src.Title) ||
          "Untitled",
        publishedAt:
          (typeof src.publishedAt === "string" && src.publishedAt) ||
          (typeof src.PublishedAt === "string" && src.PublishedAt) ||
          null,
        questionCount: int(src.questionCount ?? src.QuestionCount),
        timeLimitMinutes: num(src.timeLimitMinutes ?? src.TimeLimitMinutes),
        attemptCount: int(src.attemptCount ?? src.AttemptCount),
        completedCount: int(src.completedCount ?? src.CompletedCount),
        inProgressCount: int(src.inProgressCount ?? src.InProgressCount),
        averageScore: num(src.averageScore ?? src.AverageScore),
        averageRating: num(src.averageRating ?? src.AverageRating),
        feedbackCount: int(src.feedbackCount ?? src.FeedbackCount),
      } satisfies PublishedOverviewItem;
    })
    .filter((x): x is PublishedOverviewItem => x !== null);
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

/** SCRUM-424: intake prefs — cho phép sửa khi PUBLISHED. */
export async function setQuestionSetRecommendationSettings(
  questionSetId: string,
  autoRecommendEnabled: boolean,
  recommendationMinScore: number
): Promise<{ autoRecommendEnabled: boolean; recommendationMinScore: number }> {
  try {
    const { data } = await apiClient.put<{
      data?: { autoRecommendEnabled?: boolean; recommendationMinScore?: number };
      autoRecommendEnabled?: boolean;
      recommendationMinScore?: number;
    }>(`/api/hr/question-sets/${questionSetId}/recommendation-settings`, {
      autoRecommendEnabled,
      recommendationMinScore,
    });
    const root = (data as { data?: Record<string, unknown> })?.data ?? data;
    const rec = root && typeof root === "object" ? (root as Record<string, unknown>) : {};
    return {
      autoRecommendEnabled:
        typeof rec.autoRecommendEnabled === "boolean"
          ? rec.autoRecommendEnabled
          : typeof rec.AutoRecommendEnabled === "boolean"
            ? (rec.AutoRecommendEnabled as boolean)
            : autoRecommendEnabled,
      recommendationMinScore:
        typeof rec.recommendationMinScore === "number"
          ? rec.recommendationMinScore
          : typeof rec.RecommendationMinScore === "number"
            ? (rec.RecommendationMinScore as number)
            : recommendationMinScore,
    };
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
// Question-level Ask AI (endpoint V1 đã 410 — giữ code khi ASK_AI_ENABLED)
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
