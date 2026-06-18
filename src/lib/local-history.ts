import type { GenerationSession, GeneratedQuestion, PlanDraft, GenerationNote } from "@/types/generation-session";

const STORAGE_KEY = "hiregen_generation_history";
const MAX_SESSIONS = 50;

export interface LocalSession {
  id: string;
  jobTitle: string;
  jdContent?: string;
  note?: GenerationNote;
  planDraft?: PlanDraft;
  generatedQuestions: GeneratedQuestion[];
  status: "COMPLETED";
  hrOwner: string;
  createdAt: string;
  updatedAt: string;
}

function load(): LocalSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalSession[]) : [];
  } catch {
    return [];
  }
}

function save(sessions: LocalSession[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
}

export function saveLocalSession(session: Omit<LocalSession, "id" | "createdAt" | "updatedAt">): LocalSession {
  const now = new Date().toISOString();
  const newSession: LocalSession = {
    ...session,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    updatedAt: now,
  };
  const existing = load();
  save([newSession, ...existing]);
  return newSession;
}

export function getLocalSessions(): LocalSession[] {
  return load();
}

export function getLocalSession(id: string): LocalSession | null {
  return load().find((s) => s.id === id) ?? null;
}

// Cast LocalSession to GenerationSession shape for reuse in UI
export function toGenerationSession(s: LocalSession): GenerationSession {
  return {
    id: s.id,
    jobTitle: s.jobTitle,
    jdContent: s.jdContent,
    note: s.note,
    planDraft: s.planDraft,
    generatedQuestions: s.generatedQuestions,
    status: s.status,
    hrOwner: s.hrOwner,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}
