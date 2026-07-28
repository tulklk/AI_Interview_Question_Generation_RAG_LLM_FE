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
  PlanSummary,
  ShareLink,
  StudioDocument,
  StudioLibraryDocument,
  StudioProject,
  StudioProjectDetail,
  StudioQuestionListResponse,
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
  const { data } = await apiClient.get<StudioProjectDetail>(`/api/studio/projects/${projectId}`);
  return data;
}

export async function updateProject(projectId: string, name: string, description?: string): Promise<StudioProjectDetail> {
  const { data } = await apiClient.put<StudioProjectDetail>(`/api/studio/projects/${projectId}`, { name, description: description ?? null });
  return data;
}

export async function saveDraft(projectId: string): Promise<{ questionSetId?: string | null }> {
  try {
    const { data } = await apiClient.post<{ questionSetId?: string }>(`/api/studio/projects/${projectId}/save-draft`);
    return { questionSetId: data?.questionSetId ?? null };
  } catch {
    return {};
  }
}

export async function upsertJobDescription(projectId: string, content: string, sourceType: "PastedText" | "UploadedFile"): Promise<void> {
  await apiClient.put(`/api/studio/projects/${projectId}/job-description`, { content, sourceType });
}

export async function analyzeJobDescription(projectId: string): Promise<AnalyzeJobDescriptionResponse> {
  const { data } = await apiClient.post<AnalyzeJobDescriptionResponse>(`/api/studio/projects/${projectId}/job-description/analyze`);
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

export async function uploadDocument(projectId: string, file: File, isSelected = true): Promise<StudioDocument> {
  const form = new FormData();
  form.append("file", file);
  form.append("isSelected", String(isSelected));
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

export async function getSettings(projectId: string): Promise<StudioSettings> {
  const { data } = await apiClient.get<StudioSettings>(`/api/studio/projects/${projectId}/settings`);
  return data;
}

export async function updateSettings(projectId: string, payload: Omit<StudioSettings, "projectId" | "appliedPlanId" | "readiness">): Promise<StudioSettings> {
  const { data } = await apiClient.put<StudioSettings>(`/api/studio/projects/${projectId}/settings`, payload);
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

export async function refinePlan(projectId: string, planId: string, instruction: string): Promise<PlanSummary> {
  const { data } = await apiClient.post<PlanSummary>(
    `/api/studio/projects/${projectId}/plans/${planId}/refine`,
    { instruction },
    { timeout: 180_000 }
  );
  return data;
}

export async function approvePlan(projectId: string, planId: string, revision: number, concurrencyVersion: string, notes?: string): Promise<void> {
  await apiClient.post(`/api/studio/projects/${projectId}/plans/${planId}/approve`, { revision, concurrencyVersion, notes: notes ?? null });
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
  return data;
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
  return data;
}

export async function updateQuestion(projectId: string, questionId: string, payload: {
  content: string;
  difficulty: string;
  type: string;
  estimatedMinutes: number;
  expectedAnswer?: string;
  scoringRubric?: string;
}): Promise<void> {
  await apiClient.put(`/api/studio/projects/${projectId}/questions/${questionId}`, payload);
}

export async function deleteQuestion(projectId: string, questionId: string): Promise<void> {
  await apiClient.delete(`/api/studio/projects/${projectId}/questions/${questionId}`);
}

export async function regenerateQuestion(projectId: string, questionId: string, payload: {
  includeSampleAnswers: boolean;
  includeScoringRubric: boolean;
}): Promise<void> {
  await apiClient.post(`/api/studio/projects/${projectId}/questions/${questionId}/regenerate`, payload);
}

export async function listGenerationRuns(projectId: string): Promise<GenerationRun[]> {
  const { data } = await apiClient.get<GenerationRun[]>(`/api/studio/projects/${projectId}/question-generation-runs`);
  return data;
}

export async function publishProject(questionSetId: string): Promise<void> {
  await apiClient.post(`/api/hr/question-sets/${questionSetId}/publish`);
}

export async function unpublishProject(questionSetId: string): Promise<void> {
  await apiClient.post(`/api/hr/question-sets/${questionSetId}/unpublish`);
}

export async function createShareLink(projectId: string, permission: "View" | "Edit", expiresAt?: string): Promise<ShareLink> {
  const { data } = await apiClient.post<ShareLink>(`/api/studio/projects/${projectId}/share-links`, {
    permission,
    expiresAt: expiresAt ?? null,
  });
  return data;
}

