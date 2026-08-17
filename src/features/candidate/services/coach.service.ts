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

export interface CoachJob {
  id: string;
  status: string;
  purpose?: string;
  questionSetId?: string | null;
  errorMessage?: string | null;
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
  return {
    id: pickString(src, "id", "Id"),
    status: pickString(src, "status", "Status"),
    purpose: pickString(src, "purpose", "Purpose") || undefined,
    questionSetId: pickString(src, "questionSetId", "QuestionSetId") || null,
    errorMessage: pickString(src, "errorMessage", "ErrorMessage") || null,
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

export async function startCvDrill(skill: string): Promise<CoachJob> {
  const res = await apiClient.post("/api/candidate/coach/drills", { skill }, { timeout: 180_000 });
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
