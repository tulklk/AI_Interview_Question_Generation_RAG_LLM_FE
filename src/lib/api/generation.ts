import { apiClient } from "@/lib/api-client";
import type {
  GenerationSession,
  GeneratedQuestion,
  GenerationNote,
  PlanDraft,
  DraftQuestionSet,
  QuestionAIChat,
} from "@/types/generation-session";

export interface CreateSessionPayload {
  jdContent?: string;
  jdFilePath?: string;
  note?: GenerationNote;
}

export interface ClarifyReplyPayload {
  sessionId: string;
  message: string;
}

export interface ConfirmPlanPayload {
  sessionId: string;
}

export interface UpdateQuestionPayload {
  question?: string;
  questionType?: GeneratedQuestion["questionType"];
  difficulty?: GeneratedQuestion["difficulty"];
  rationale?: string;
  sampleAnswer?: string;
}

export interface AddQuestionPayload {
  sessionId: string;
  question: string;
  questionType: GeneratedQuestion["questionType"];
  difficulty: GeneratedQuestion["difficulty"];
  rationale?: string;
  sampleAnswer?: string;
  orderIndex: number;
}

export interface AskAIPayload {
  sessionId: string;
  questionId: string;
  message: string;
}

export interface SaveDraftPayload {
  sessionId: string;
}

// Generation Session APIs
export async function createGenerationSession(
  payload: CreateSessionPayload
): Promise<GenerationSession> {
  const { data } = await apiClient.post<GenerationSession>(
    "/api/v1/hr/generation-sessions",
    payload
  );
  return data;
}

export async function getGenerationHistory(): Promise<GenerationSession[]> {
  const { data } = await apiClient.get<GenerationSession[]>(
    "/api/v1/hr/generation-sessions"
  );
  return data;
}

export async function getGenerationSession(id: string): Promise<GenerationSession> {
  const { data } = await apiClient.get<GenerationSession>(
    `/api/v1/hr/generation-sessions/${id}`
  );
  return data;
}

export async function replyClarify(
  payload: ClarifyReplyPayload
): Promise<GenerationSession> {
  const { data } = await apiClient.post<GenerationSession>(
    `/api/v1/hr/generation-sessions/${payload.sessionId}/clarify`,
    { message: payload.message }
  );
  return data;
}

export async function confirmPlan(payload: ConfirmPlanPayload): Promise<GenerationSession> {
  const { data } = await apiClient.post<GenerationSession>(
    `/api/v1/hr/generation-sessions/${payload.sessionId}/confirm-plan`
  );
  return data;
}

// Generated Question APIs
export async function updateGeneratedQuestion(
  sessionId: string,
  questionId: string,
  payload: UpdateQuestionPayload
): Promise<GeneratedQuestion> {
  const { data } = await apiClient.put<GeneratedQuestion>(
    `/api/v1/hr/generation-sessions/${sessionId}/questions/${questionId}`,
    payload
  );
  return data;
}

export async function addGeneratedQuestion(
  payload: AddQuestionPayload
): Promise<GeneratedQuestion> {
  const { data } = await apiClient.post<GeneratedQuestion>(
    `/api/v1/hr/generation-sessions/${payload.sessionId}/questions`,
    payload
  );
  return data;
}

export async function deleteGeneratedQuestion(
  sessionId: string,
  questionId: string
): Promise<void> {
  await apiClient.delete(
    `/api/v1/hr/generation-sessions/${sessionId}/questions/${questionId}`
  );
}

export async function reorderGeneratedQuestions(
  sessionId: string,
  questionIds: string[]
): Promise<GeneratedQuestion[]> {
  const { data } = await apiClient.put<GeneratedQuestion[]>(
    `/api/v1/hr/generation-sessions/${sessionId}/questions/reorder`,
    { questionIds }
  );
  return data;
}

// Ask AI APIs
export async function askAIForQuestion(
  payload: AskAIPayload
): Promise<QuestionAIChat> {
  const { data } = await apiClient.post<QuestionAIChat>(
    `/api/v1/hr/generation-sessions/${payload.sessionId}/questions/${payload.questionId}/ask-ai`,
    { message: payload.message }
  );
  return data;
}

export async function getQuestionAIChatHistory(
  sessionId: string,
  questionId: string
): Promise<QuestionAIChat[]> {
  const { data } = await apiClient.get<QuestionAIChat[]>(
    `/api/v1/hr/generation-sessions/${sessionId}/questions/${questionId}/ask-ai`
  );
  return data;
}

// Draft Question Set APIs
export async function saveDraftQuestionSet(
  payload: SaveDraftPayload
): Promise<DraftQuestionSet> {
  const { data } = await apiClient.post<DraftQuestionSet>(
    `/api/v1/hr/question-sets/draft`,
    payload
  );
  return data;
}

export async function uploadJdFile(file: File): Promise<{ filePath: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<{ filePath: string }>(
    "/api/v1/hr/jd-upload",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}
