import { apiClient } from "@/core/api/http-client";

function asRecord(val: unknown): Record<string, unknown> | null {
  return val && typeof val === "object" ? (val as Record<string, unknown>) : null;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
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

function pickStringArray(obj: Record<string, unknown>, ...keys: string[]): string[] {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  }
  return [];
}

function extractData(raw: unknown): Record<string, unknown> | null {
  const root = asRecord(raw);
  if (!root) return null;
  return asRecord(root.data) ?? root;
}

export interface PersonalSetJob {
  id: string;
  status: string;
  questionSetId?: string | null;
  errorMessage?: string | null;
}

export interface PersonalSetListItem {
  id: string;
  title: string;
  skills: string[];
  totalQuestions: number;
  myLastScore?: number | null;
  myLastCompletedAt?: string | null;
}

export async function createPersonalSetFromText(jobDescription: string, numberOfQuestions = 10): Promise<PersonalSetJob> {
  const res = await apiClient.post("/api/candidate/personal-sets", { jobDescription, numberOfQuestions });
  return mapJob(extractData(res.data));
}

export async function createPersonalSetFromFile(file: File, numberOfQuestions = 10): Promise<PersonalSetJob> {
  const form = new FormData();
  form.append("file", file);
  form.append("numberOfQuestions", String(numberOfQuestions));
  const res = await apiClient.post("/api/candidate/personal-sets/from-file", form);
  return mapJob(extractData(res.data));
}

export async function getPersonalSetJob(id: string): Promise<PersonalSetJob> {
  const res = await apiClient.get(`/api/candidate/personal-sets/jobs/${id}`);
  return mapJob(extractData(res.data));
}

export async function listMyPersonalSets(): Promise<PersonalSetListItem[]> {
  const res = await apiClient.get("/api/candidate/personal-sets");
  const root = asRecord(res.data);
  const data = root ? (Array.isArray(root.data) ? root.data : Array.isArray(root) ? root : []) : [];
  const items = Array.isArray(data) ? data : [];
  return items.map((raw) => {
    const src = asRecord(raw) ?? {};
    return {
      id: pickString(src, "id"),
      title: pickString(src, "title") || "My set",
      skills: pickStringArray(src, "skills"),
      totalQuestions: pickNumber(src, "totalQuestions") ?? 0,
      myLastScore: pickNumber(src, "myLastScore"),
      myLastCompletedAt: pickString(src, "myLastCompletedAt") || null,
    };
  }).filter((x) => x.id);
}

function mapJob(src: Record<string, unknown> | null): PersonalSetJob {
  if (!src) throw new Error("Invalid job payload");
  return {
    id: pickString(src, "id"),
    status: pickString(src, "status"),
    questionSetId: pickString(src, "questionSetId") || null,
    errorMessage: pickString(src, "errorMessage") || null,
  };
}
