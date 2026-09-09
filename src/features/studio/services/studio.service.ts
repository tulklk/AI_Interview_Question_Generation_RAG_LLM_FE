import { apiClient } from "@/core/api/http-client";
import type {
  AnalyzeJobDescriptionResponse,
  ApplyPlanSettingsPayload,
  ChatMessage,
  ChatSession,
  GenerationRun,
  JobDescriptionContent,
  PlanApprovalHistoryItem,
  PlanDetail,
  PlanRefineResult,
  PlanSummary,
  ShareLink,
  StudioDocument,
  StudioKnowledgeSuggestion,
  StudioLibraryDocument,
  StudioProject,
  StudioProjectDetail,
  StudioQuestion,
  StudioQuestionListResponse,
  RecommendInterviewConfigurationResponse,
  StudioRetrievePreview,
  StudioSettings,
  UploadJobDescriptionResponse,
} from "@/features/studio/types/studio.types";

export async function createProject(name: string, description?: string): Promise<StudioProject> {
  const { data } = await apiClient.post<StudioProject>("/api/studio/projects", { name, description: description ?? null });
  return data;
}

export async function listProjects(): Promise<StudioProject[]> {
  const { data } = await apiClient.get<StudioProject[]>("/api/studio/projects");
  return data;
}

export async function getProject(projectId: string): Promise<StudioProjectDetail> {
  const { data } = await apiClient.get<Record<string, unknown>>(`/api/studio/projects/${projectId}`);
  return mapProjectDetail(data);
}

export async function updateProject(projectId: string, name: string, description?: string): Promise<StudioProjectDetail> {
  const { data } = await apiClient.put<Record<string, unknown>>(`/api/studio/projects/${projectId}`, {
    name,
    description: description ?? null,
  });
  return mapProjectDetail(data);
}

export async function saveDraft(projectId: string): Promise<{ questionSetId?: string | null; status?: string; questionCount?: number }> {
  const { data } = await apiClient.post<{
    questionSetId?: string;
    QuestionSetId?: string;
    status?: string;
    Status?: string;
    questionCount?: number;
    QuestionCount?: number;
  }>(`/api/studio/projects/${projectId}/save`);
  return {
    questionSetId: data?.questionSetId ?? data?.QuestionSetId ?? null,
    status: data?.status ?? data?.Status,
    questionCount: data?.questionCount ?? data?.QuestionCount,
  };
}

function mapProjectDetail(raw: Record<string, unknown>): StudioProjectDetail {
  const pick = (...keys: string[]): unknown => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null) return raw[k];
    }
    return undefined;
  };
  return {
    id: String(pick("id", "Id") ?? ""),
    ownerId: String(pick("ownerId", "OwnerId") ?? ""),
    name: String(pick("name", "Name") ?? ""),
    description: (pick("description", "Description") as string | null | undefined) ?? null,
    status: (pick("status", "Status") as StudioProjectDetail["status"]) ?? "Draft",
    latestPlanRevision: Number(pick("latestPlanRevision", "LatestPlanRevision") ?? 0),
    questionSetId: (pick("questionSetId", "QuestionSetId") as string | null | undefined) ?? null,
    isPublished: Boolean(pick("isPublished", "IsPublished") ?? false),
    questionSetStatus: (pick("questionSetStatus", "QuestionSetStatus") as string | null | undefined) ?? null,
  };
}

export async function upsertJobDescription(
  projectId: string,
  content: string,
  sourceType: "PastedText" | "UploadedFile"
): Promise<AnalyzeJobDescriptionResponse> {
  // SCRUM-432: PUT validate + classify + lưu + trả summary (không cần POST analyze lần 2)
  const { data } = await apiClient.put<AnalyzeJobDescriptionResponse>(
    `/api/studio/projects/${projectId}/job-description`,
    { content, sourceType },
    { timeout: 180_000 }
  );
  return data;
}

export async function analyzeJobDescription(projectId: string): Promise<AnalyzeJobDescriptionResponse> {
  const { data } = await apiClient.post<AnalyzeJobDescriptionResponse>(`/api/studio/projects/${projectId}/job-description/analyze`);
  return data;
}

/** Phase 2: AI đề xuất cấu hình phỏng vấn — lưu draft trên BE, không ghi đè settings HR. */
export async function recommendInterviewConfiguration(
  projectId: string,
  payload?: { numberOfQuestions?: number }
): Promise<RecommendInterviewConfigurationResponse> {
  const { data } = await apiClient.post<RecommendInterviewConfigurationResponse>(
    `/api/studio/projects/${projectId}/job-description/recommend-configuration`,
    payload ?? {},
    { timeout: 180_000 }
  );
  return data;
}

/** SCRUM-416: HR xác nhận / sửa vị trí đã extract từ JD. */
export async function updateJobDescriptionPosition(
  projectId: string,
  position: string
): Promise<AnalyzeJobDescriptionResponse> {
  const { data } = await apiClient.patch<AnalyzeJobDescriptionResponse>(
    `/api/studio/projects/${projectId}/job-description/position`,
    { position }
  );
  return data;
}

/** SCRUM-417: HR xác nhận Position + Level (+ Role / Skills) trước generate plan. */
export async function updateJobDescriptionMetadata(
  projectId: string,
  payload: {
    position: string;
    detectedSeniority: string;
    detectedRole?: string | null;
    skills?: string[];
  }
): Promise<AnalyzeJobDescriptionResponse> {
  const { data } = await apiClient.patch<AnalyzeJobDescriptionResponse>(
    `/api/studio/projects/${projectId}/job-description/metadata`,
    {
      position: payload.position,
      detectedSeniority: payload.detectedSeniority,
      detectedRole: payload.detectedRole?.trim() || null,
      skills: payload.skills ?? undefined,
    }
  );
  return data;
}

export async function getJobDescription(projectId: string): Promise<JobDescriptionContent | null> {
  try {
    const { data } = await apiClient.get<JobDescriptionContent>(`/api/studio/projects/${projectId}/job-description`);
    return data;
  } catch {
    return null;
  }
}

/** Upload JD file (PDF/DOCX/TXT/ảnh) — controller mới StudioJobDescriptionUploadController */
export async function uploadJobDescriptionFile(projectId: string, file: File): Promise<UploadJobDescriptionResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<UploadJobDescriptionResponse>(
    `/api/studio/projects/${projectId}/job-description/upload`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

/** Sources → RAG (y hệt Knowledge Base HR): /knowledge-documents */
export async function listDocuments(projectId: string): Promise<StudioDocument[]> {
  const { data } = await apiClient.get<StudioDocument[]>(`/api/studio/projects/${projectId}/knowledge-documents`);
  return data;
}

export async function uploadDocument(
  projectId: string,
  file: File,
  isSelected = true,
  documentType?: string
): Promise<StudioDocument> {
  const form = new FormData();
  form.append("file", file);
  form.append("isSelected", String(isSelected));
  if (documentType) form.append("documentType", documentType);
  // apiClient mặc định application/json — phải override multipart (giống upload JD / HR knowledge)
  const { data } = await apiClient.post<StudioDocument>(
    `/api/studio/projects/${projectId}/knowledge-documents`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function setDocumentSelection(projectId: string, documentId: string, isSelected: boolean): Promise<StudioDocument> {
  const { data } = await apiClient.patch<StudioDocument>(
    `/api/studio/projects/${projectId}/knowledge-documents/${documentId}/selection`,
    { isSelected }
  );
  return data;
}

export async function reingestDocument(projectId: string, documentId: string): Promise<StudioDocument> {
  const { data } = await apiClient.post<StudioDocument>(
    `/api/studio/projects/${projectId}/knowledge-documents/${documentId}/reingest`
  );
  return data;
}

export async function deleteDocument(projectId: string, documentId: string): Promise<void> {
  await apiClient.delete(`/api/studio/projects/${projectId}/knowledge-documents/${documentId}`);
}

/** SCRUM-373: list Knowledge Documents HR để chọn gắn vào Studio */
export async function listLibraryDocuments(projectId: string): Promise<StudioLibraryDocument[]> {
  const { data } = await apiClient.get<StudioLibraryDocument[]>(
    `/api/studio/projects/${projectId}/knowledge-documents/library`
  );
  return data;
}

/** SCRUM-373: gắn doc đã upload ở /hr/knowledge vào project (không upload lại) */
export async function attachLibraryDocuments(
  projectId: string,
  knowledgeDocumentIds: string[],
  isSelected = true
): Promise<StudioDocument[]> {
  const { data } = await apiClient.post<StudioDocument[]>(
    `/api/studio/projects/${projectId}/knowledge-documents/attach`,
    { knowledgeDocumentIds, isSelected }
  );
  return data;
}

/** SCRUM-443: gợi ý gắn theo JD */
export async function suggestKnowledgeDocuments(projectId: string): Promise<StudioKnowledgeSuggestion[]> {
  const { data } = await apiClient.post<StudioKnowledgeSuggestion[]>(
    `/api/studio/projects/${projectId}/knowledge-documents/suggestions`
  );
  return Array.isArray(data) ? data : [];
}

/** SCRUM-444: preview retrieve 1 doc với JD */
export async function retrieveKnowledgePreview(
  projectId: string,
  knowledgeDocumentId: string
): Promise<StudioRetrievePreview> {
  const { data } = await apiClient.post<StudioRetrievePreview>(
    `/api/studio/projects/${projectId}/knowledge-documents/retrieve-preview`,
    { knowledgeDocumentId }
  );
  return data;
}

export async function getSettings(projectId: string): Promise<StudioSettings> {
  const { data } = await apiClient.get<StudioSettings>(`/api/studio/projects/${projectId}/settings`);
  return data;
}

export async function updateSettings(projectId: string, payload: Omit<StudioSettings, "projectId" | "appliedPlanId" | "readiness">): Promise<StudioSettings> {
  // BE persist field `language` (+ alias OutputLanguage); gửi cả hai cho chắc
  const body = {
    ...payload,
    language: payload.outputLanguage,
    outputLanguage: payload.outputLanguage,
  };
  const { data } = await apiClient.put<StudioSettings>(`/api/studio/projects/${projectId}/settings`, body);
  return data;
}

/** SCRUM-370 + SCRUM-376: Áp dụng quick controls → patch plan local (không RAG) */
export async function applyPlanSettings(
  projectId: string,
  planId: string,
  payload: ApplyPlanSettingsPayload
): Promise<PlanSummary> {
  const { data } = await apiClient.post<PlanSummary>(
    `/api/studio/projects/${projectId}/plans/${planId}/apply-settings`,
    payload,
    { timeout: 30_000 }
  );
  return data;
}

export async function generatePlan(projectId: string): Promise<PlanSummary> {
  const { data } = await apiClient.post<PlanSummary>(
    `/api/studio/projects/${projectId}/plans/generate`,
    undefined,
    { timeout: 180_000 }
  );
  return data;
}

export async function listPlans(projectId: string): Promise<PlanSummary[]> {
  const { data } = await apiClient.get<PlanSummary[]>(`/api/studio/projects/${projectId}/plans`);
  return data;
}

export async function getCurrentPlan(projectId: string): Promise<PlanDetail | null> {
  try {
    const { data, status } = await apiClient.get<PlanDetail | "">(`/api/studio/projects/${projectId}/plans/current`);
    if (status === 204 || !data) return null;
    return data as PlanDetail;
  } catch {
    return null;
  }
}

export async function getPlanDetail(projectId: string, planId: string): Promise<PlanDetail> {
  const { data } = await apiClient.get<PlanDetail>(`/api/studio/projects/${projectId}/plans/${planId}`);
  return data;
}

export async function submitPlanForApproval(projectId: string, planId: string): Promise<PlanSummary> {
  const { data } = await apiClient.post<PlanSummary>(`/api/studio/projects/${projectId}/plans/${planId}/submit-for-approval`);
  return data;
}

export async function refinePlan(projectId: string, planId: string, instruction: string): Promise<PlanRefineResult> {
  const { data } = await apiClient.post<PlanRefineResult>(
    `/api/studio/projects/${projectId}/plans/${planId}/refine`,
    { instruction },
    { timeout: 180_000 }
  );
  return data;
}

export async function approvePlan(projectId: string, planId: string, revision: number, concurrencyVersion: string, notes?: string): Promise<void> {
  await apiClient.post(`/api/studio/projects/${projectId}/plans/${planId}/approve`, { revision, concurrencyVersion, notes: notes ?? null });
}

/** SCRUM-393: đổi tiêu đề / tên công việc trên plan — BE lưu Title (+ sync roleTitle JSON). */
export async function renamePlanTitle(projectId: string, planId: string, title: string): Promise<PlanSummary> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Tiêu đề không được để trống.");
  const { data } = await apiClient.put<PlanSummary>(
    `/api/studio/projects/${projectId}/plans/${planId}/title`,
    { title: trimmed }
  );
  return data;
}

export async function rejectPlan(projectId: string, planId: string, notes?: string): Promise<void> {
  await apiClient.post(`/api/studio/projects/${projectId}/plans/${planId}/reject`, { notes: notes ?? null });
}

export async function getPlanHistory(projectId: string, planId: string): Promise<PlanApprovalHistoryItem[]> {
  const { data } = await apiClient.get<PlanApprovalHistoryItem[]>(`/api/studio/projects/${projectId}/plans/${planId}/history`);
  return data;
}

export async function getChatSession(projectId: string): Promise<ChatSession | null> {
  try {
    const { data } = await apiClient.get<ChatSession>(`/api/studio/projects/${projectId}/chat/session`);
    return data;
  } catch {
    return null;
  }
}

export async function getChatMessages(projectId: string): Promise<ChatMessage[]> {
  const { data } = await apiClient.get<ChatMessage[]>(`/api/studio/projects/${projectId}/chat/messages`);
  return data;
}

export async function generateQuestions(projectId: string, payload: {
  planId: string;
  replaceExisting: boolean;
  includeSampleAnswers: boolean;
  includeScoringRubric: boolean;
}): Promise<GenerationRun> {
  // SCRUM-371: 202 Accepted + run; câu hỏi về qua RAG callback
  const { data } = await apiClient.post<GenerationRun>(
    `/api/studio/projects/${projectId}/questions/generate`,
    payload,
    { timeout: 60_000 }
  );
  return data;
}

export async function getGenerationRun(projectId: string, runId: string): Promise<GenerationRun> {
  const { data } = await apiClient.get<GenerationRun>(
    `/api/studio/projects/${projectId}/question-generation-runs/${runId}`
  );
  return {
    ...data,
    targetQuestionId:
      data.targetQuestionId ??
      (data as { TargetQuestionId?: string | null }).TargetQuestionId ??
      null,
  };
}

export async function listQuestions(projectId: string, query: {
  planId?: string;
  sectionId?: string;
  difficulty?: string;
  type?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<StudioQuestionListResponse> {
  const { data } = await apiClient.get<StudioQuestionListResponse>(`/api/studio/projects/${projectId}/questions`, { params: query });
  // Chuẩn hóa camelCase/PascalCase để UI luôn nhận codeTemplateType + codeSnippet
  const items = (data.items ?? []).map((q) => {
    const raw = q as StudioQuestion & {
      CodeTemplateType?: string | null;
      CodeSnippet?: string | null;
      ImageHint?: string | null;
      AttachedImageUrl?: string | null;
      AnswerMethod?: string | null;
      code_template_type?: string | null;
      code_snippet?: string | null;
      image_hint?: string | null;
      attached_image_url?: string | null;
      answer_method?: string | null;
      RubricJson?: string | null;
      rubric_json?: string | null;
    };
    const amRaw = (q.answerMethod ?? raw.AnswerMethod ?? raw.answer_method ?? "").toString().trim().toLowerCase();
    const answerMethod = amRaw === "code" ? "Code" : amRaw === "text" ? "Text" : (q.answerMethod ?? null);
    return {
      ...q,
      rubricJson: (q.rubricJson ?? raw.RubricJson ?? raw.rubric_json ?? null) as StudioQuestion["rubricJson"],
      codeTemplateType: (q.codeTemplateType ?? raw.CodeTemplateType ?? raw.code_template_type ?? null) as StudioQuestion["codeTemplateType"],
      codeSnippet: (q.codeSnippet ?? raw.CodeSnippet ?? raw.code_snippet ?? null) as StudioQuestion["codeSnippet"],
      imageHint: (q.imageHint ?? raw.ImageHint ?? raw.image_hint ?? null) as StudioQuestion["imageHint"],
      attachedImageUrl: (q.attachedImageUrl ?? raw.AttachedImageUrl ?? raw.attached_image_url ?? null) as StudioQuestion["attachedImageUrl"],
      answerMethod: answerMethod as StudioQuestion["answerMethod"],
    };
  });
  return { ...data, items };
}

export async function updateQuestion(projectId: string, questionId: string, payload: {
  content: string;
  difficulty: string;
  type: string;
  estimatedMinutes: number;
  expectedAnswer?: string;
  scoringRubric?: string;
  rubricJson?: string;
}): Promise<void> {
  await apiClient.put(`/api/studio/projects/${projectId}/questions/${questionId}`, payload);
}

export async function deleteQuestion(projectId: string, questionId: string): Promise<void> {
  await apiClient.delete(`/api/studio/projects/${projectId}/questions/${questionId}`);
}

/** SCRUM-396: upload ảnh đính kèm câu hỏi lên Azure Blob qua BE. */
export async function uploadQuestionImage(
  projectId: string,
  questionId: string,
  file: File
): Promise<StudioQuestion> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<StudioQuestion>(
    `/api/studio/projects/${projectId}/questions/${questionId}/image`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return {
    ...data,
    imageHint: data.imageHint ?? (data as { ImageHint?: string }).ImageHint ?? null,
    attachedImageUrl: data.attachedImageUrl ?? (data as { AttachedImageUrl?: string }).AttachedImageUrl ?? null,
  };
}

/** SCRUM-396: xóa ảnh đính kèm câu hỏi. */
export async function deleteQuestionImage(projectId: string, questionId: string): Promise<StudioQuestion> {
  const { data } = await apiClient.delete<StudioQuestion>(
    `/api/studio/projects/${projectId}/questions/${questionId}/image`
  );
  return {
    ...data,
    imageHint: data.imageHint ?? (data as { ImageHint?: string }).ImageHint ?? null,
    attachedImageUrl: data.attachedImageUrl ?? (data as { AttachedImageUrl?: string }).AttachedImageUrl ?? null,
  };
}

/** SCRUM-429: enqueue regen nền — trả GenerationRun để poll. */
export async function regenerateQuestion(projectId: string, questionId: string, payload: {
  includeSampleAnswers: boolean;
  includeScoringRubric: boolean;
  /** SCRUM-428: lưu ý HR khi regen */
  instruction?: string | null;
}): Promise<GenerationRun> {
  const { data } = await apiClient.post<GenerationRun>(
    `/api/studio/projects/${projectId}/questions/${questionId}/regenerate`,
    {
      includeSampleAnswers: payload.includeSampleAnswers,
      includeScoringRubric: payload.includeScoringRubric,
      instruction: payload.instruction?.trim() || null,
    }
  );
  return {
    ...data,
    targetQuestionId:
      data.targetQuestionId ??
      (data as { TargetQuestionId?: string | null }).TargetQuestionId ??
      null,
  };
}

export async function listGenerationRuns(projectId: string): Promise<GenerationRun[]> {
  const { data } = await apiClient.get<GenerationRun[]>(`/api/studio/projects/${projectId}/question-generation-runs`);
  return data;
}

/** SCRUM-439: publish từ Studio — chọn interview question ids + time limit + recommend. */
export async function publishProject(
  projectId: string,
  body?: {
    interviewQuestionIds?: string[];
    timeLimitMinutes?: number | null;
    autoRecommendEnabled?: boolean;
    recommendationMinScore?: number;
  }
): Promise<void> {
  await apiClient.post(`/api/studio/projects/${projectId}/publish`, {
    interviewQuestionIds: body?.interviewQuestionIds ?? null,
    timeLimitMinutes: body?.timeLimitMinutes ?? null,
    autoRecommendEnabled: body?.autoRecommendEnabled ?? null,
    recommendationMinScore: body?.recommendationMinScore ?? null,
  });
}

export async function unpublishProject(projectId: string): Promise<number> {
  const { data } = await apiClient.post<unknown>(`/api/studio/projects/${projectId}/unpublish`);
  const rec = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const inner = rec.data && typeof rec.data === "object" ? (rec.data as Record<string, unknown>) : rec;
  const n = Number(inner.abandonedSessionCount ?? inner.AbandonedSessionCount ?? 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export async function createShareLink(projectId: string, permission: "View" | "Edit", expiresAt?: string): Promise<ShareLink> {
  const { data } = await apiClient.post<ShareLink>(`/api/studio/projects/${projectId}/share-links`, {
    permission,
    expiresAt: expiresAt ?? null,
  });
  return data;
}

