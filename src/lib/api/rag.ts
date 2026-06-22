import axios from "axios";
import type { ClarifyMessage, PlanDraft, GeneratedQuestion, QuestionType, DifficultyLevel } from "@/types/generation-session";

// ---------------------------------------------------------------------------
// RAG calls go through local Next.js proxy routes (/api/rag/...)
// so the browser never hits iqgsrag.cloud directly (avoids CORS).
// ---------------------------------------------------------------------------

const ragClient = axios.create({
  baseURL: "",   // relative — same origin as the Next.js app
  timeout: 120_000,
  headers: { "Content-Type": "application/json" },
});

// ---------------------------------------------------------------------------
// Raw RAG response types (legacy snake_case format)
// ---------------------------------------------------------------------------

interface RagMessage {
  role: string;       // "assistant" | "user" | "ai" | "hr"
  content: string;
}

interface RagPlan {
  role?: string;
  level?: string;
  question_count?: number;
  question_types?: string[];
  topics?: string[];
  constraints?: string;
  summary?: string;
}

interface RagPlanSession {
  session_id: string;
  messages: RagMessage[];
  status: string;     // "clarifying" | "plan_ready" | "confirmed" | …
  plan?: RagPlan;
}

interface RagQuestion {
  question: string;
  type?: string;
  question_type?: string;
  difficulty?: string;
  rationale?: string;
  sample_answer?: string;
}

interface RagQuestionsResult {
  session_id?: string;
  questions: RagQuestion[];
}

// ---------------------------------------------------------------------------
// V1 API envelope (new format from /api/v1/...)
// ---------------------------------------------------------------------------

interface V1PlanData {
  assistant_message?: string;
  clarifying_questions?: string[];
  plan?: RagPlan;
  validation_errors?: string[];
  sources?: unknown[];
  raw_answer?: string;
}

interface V1Meta {
  session_id?: string;
  phase?: string;        // "clarifying" | "plan_proposed" | "confirmed"
  processing_time_ms?: number;
  conversation_id?: string | null;
}

interface V1QuestionData {
  questions?: RagQuestion[];
}

interface V1Envelope<T> {
  success: boolean;
  data: T;
  error?: { code?: string; message?: string } | null;
  meta?: V1Meta;
}

// ---------------------------------------------------------------------------
// Normalise: Accept EITHER v1 envelope OR legacy flat format for plan endpoints
// ---------------------------------------------------------------------------

function normalisePlanSession(raw: unknown): RagPlanSession {
  const r = raw as Record<string, unknown>;

  // Detect v1 envelope by presence of "success" + "meta" fields
  if (r.success !== undefined && r.meta !== undefined) {
    const envelope = raw as V1Envelope<V1PlanData>;
    const data = envelope.data ?? {};
    const meta = envelope.meta ?? {};

    // Map v1 "phase" → legacy "status"
    const phaseToStatus: Record<string, string> = {
      clarifying:     "clarifying",
      plan_proposed:  "plan_proposed",
      confirmed:      "confirmed",
    };
    const status = phaseToStatus[meta.phase ?? ""] ?? (meta.phase ?? "clarifying");

    // Convert assistant_message to the messages[] array the frontend expects
    const messages: RagMessage[] = [];
    if (data.assistant_message?.trim()) {
      messages.push({ role: "assistant", content: data.assistant_message });
    }

    return {
      session_id: meta.session_id ?? "",
      messages,
      status,
      plan: data.plan ?? undefined,
    };
  }

  // Legacy flat format
  return raw as RagPlanSession;
}

function normaliseQuestionsResult(raw: unknown): RagQuestionsResult {
  const r = raw as Record<string, unknown>;

  // Detect v1 envelope
  if (r.success !== undefined && r.data !== undefined) {
    const envelope = raw as V1Envelope<V1QuestionData>;
    return {
      session_id: envelope.meta?.session_id,
      questions: envelope.data?.questions ?? [],
    };
  }

  return raw as RagQuestionsResult;
}

// ---------------------------------------------------------------------------
// Mappers: RAG types → app types
// ---------------------------------------------------------------------------

function mapRagMessages(msgs: RagMessage[]): ClarifyMessage[] {
  return msgs.map((m, i) => ({
    id: `rag-${i}-${Date.now()}`,
    role: (m.role === "assistant" || m.role === "ai") ? "ai" : "hr",
    content: m.content,
    timestamp: new Date().toISOString(),
  }));
}

function mapRagPlan(plan: RagPlan): PlanDraft {
  const allowedTypes: QuestionType[] = ["Technical", "Behavioral", "Situational", "Competency-based"];
  const rawTypes = plan.question_types ?? [];

  // v1 uses lowercase ("technical") → capitalise for frontend
  const mappedTypes = rawTypes
    .map((t) => (t.charAt(0).toUpperCase() + t.slice(1)) as QuestionType)
    .filter((t) => allowedTypes.includes(t));

  return {
    role: plan.role ?? "",
    level: plan.level ?? "",
    questionCount: plan.question_count ?? 0,
    questionTypes: mappedTypes.length ? mappedTypes : ["Technical"],
    topics: plan.topics ?? [],
    constraints: plan.constraints,
    summary: plan.summary,
  };
}

function mapRagQuestion(q: RagQuestion, index: number): GeneratedQuestion {
  const allowedDifficulty: DifficultyLevel[] = ["Easy", "Medium", "Hard"];
  const rawDiff = (q.difficulty ?? "Medium") as DifficultyLevel;
  const difficulty = allowedDifficulty.includes(rawDiff) ? rawDiff : "Medium";

  const allowedTypes: QuestionType[] = ["Technical", "Behavioral", "Situational", "Competency-based"];
  const rawType = (q.type ?? q.question_type ?? "Technical");
  const normType = (rawType.charAt(0).toUpperCase() + rawType.slice(1)) as QuestionType;
  const questionType = allowedTypes.includes(normType) ? normType : "Technical";

  return {
    id: `q-${index}-${Date.now()}`,
    question: q.question,
    questionType,
    difficulty,
    rationale: q.rationale,
    sampleAnswer: q.sample_answer,
    citations: [],
    orderIndex: index,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPlanStatus(status: string): boolean {
  const s = (status ?? "").toLowerCase();
  return s.includes("plan") || s.includes("ready") || s.includes("proposed") || s.includes("confirmed");
}

// ---------------------------------------------------------------------------
// API payload types (what we send to RAG)
// ---------------------------------------------------------------------------

export interface StartPlanPayload {
  jd_text?: string;
  owner_id?: string;
  num_questions?: number;
  question_types?: string[];
  focus_skills?: string;
  additional_notes?: string;
}

// ---------------------------------------------------------------------------
// API result types
// ---------------------------------------------------------------------------

export interface RagSessionResult {
  ragSessionId: string;
  messages: ClarifyMessage[];
  plan: PlanDraft | null;
  isPlanReady: boolean;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function startInterviewPlan(payload: StartPlanPayload): Promise<RagSessionResult> {
  const { data } = await ragClient.post<unknown>("/api/rag/interview-plans/start/", payload);
  const session = normalisePlanSession(data);
  return {
    ragSessionId: session.session_id,
    messages: mapRagMessages(session.messages ?? []),
    plan: session.plan ? mapRagPlan(session.plan) : null,
    isPlanReady: isPlanStatus(session.status),
  };
}

export async function sendPlanMessage(
  ragSessionId: string,
  message: string,
  ownerId: string,
): Promise<RagSessionResult> {
  const { data } = await ragClient.post<unknown>("/api/rag/interview-plans/messages/", {
    session_id: ragSessionId,
    owner_id: ownerId,
    message,
  });
  const session = normalisePlanSession(data);
  return {
    ragSessionId: session.session_id,
    messages: mapRagMessages(session.messages ?? []),
    plan: session.plan ? mapRagPlan(session.plan) : null,
    isPlanReady: isPlanStatus(session.status),
  };
}

function planDraftToV1Body(ownerId: string, plan: PlanDraft): Record<string, unknown> {
  return {
    owner_id: ownerId,
    role: plan.role,
    level: plan.level,
    question_count: plan.questionCount,
    question_types: plan.questionTypes.map((t) => t.toLowerCase()),
    topics: plan.topics ?? [],
    summary: plan.summary ?? "",
    constraints: plan.constraints ?? "",
    notes: "",
  };
}

export async function confirmInterviewPlan(
  ragSessionId: string,
  ownerId: string,
  planDraft: PlanDraft,
): Promise<RagSessionResult> {
  const { data } = await ragClient.post<unknown>("/api/rag/interview-plans/confirm/", {
    session_id: ragSessionId,
    owner_id: ownerId,
    plan_draft: planDraftToV1Body(ownerId, planDraft),
  });
  const session = normalisePlanSession(data);
  return {
    ragSessionId: session.session_id,
    messages: mapRagMessages(session.messages ?? []),
    plan: session.plan ? mapRagPlan(session.plan) : null,
    isPlanReady: true,
  };
}

export async function generateInterviewQuestions(
  ownerId: string,
  plan: PlanDraft,
): Promise<GeneratedQuestion[]> {
  const { data } = await ragClient.post<unknown>("/api/rag/interview-questions/", {
    owner_id: ownerId,
    confirmed_plan: planDraftToV1Body(ownerId, plan),
  });
  const result = normaliseQuestionsResult(data);
  return (result.questions ?? []).map(mapRagQuestion);
}

export async function uploadHrJdFile(ownerId: string, file: File): Promise<{ success: boolean; message: string }> {
  const formData = new FormData();
  formData.append("files", file);
  const { data } = await ragClient.post(
    `/api/rag/knowledge/hr/${encodeURIComponent(ownerId)}/files/`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return {
    success: (data as Record<string, unknown>)?.success as boolean ?? true,
    message: ((data as Record<string, unknown>)?.data as Record<string, unknown>)?.message as string ?? "Uploaded",
  };
}
