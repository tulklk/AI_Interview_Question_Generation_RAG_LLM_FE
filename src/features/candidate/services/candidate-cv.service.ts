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

function pickNullableString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") return v;
    if (v === null) return null;
  }
  return null;
}

function pickStringArray(obj: Record<string, unknown>, ...keys: string[]): string[] {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  }
  return [];
}

export interface CvInfo {
  fileName: string;
  skills: string[];
  summary: string | null;
  techStack: string[];
  parsedAt: string | null;
  uploadedAt: string;
  downloadUrl: string;
}

function normalizeCv(raw: unknown): CvInfo | null {
  const root = asRecord(raw);
  const src = root ? (asRecord(root.data) ?? root) : null;
  if (!src) return null;
  const fileName = pickString(src, "cvFileName", "fileName");
  if (!fileName) return null;
  return {
    fileName,
    skills: pickStringArray(src, "skills"),
    summary: pickNullableString(src, "summary"),
    techStack: pickStringArray(src, "techStack"),
    parsedAt: pickNullableString(src, "parsedAt"),
    uploadedAt: pickString(src, "uploadedAt"),
    downloadUrl: pickString(src, "downloadUrl"),
  };
}

/** Thrown for 400s (wrong format / too large) — the server never saves the file in this case. */
export class CvValidationError extends Error {}

export async function getCv(): Promise<CvInfo | null> {
  try {
    const res = await apiClient.get("/api/candidate/cv");
    return normalizeCv(res.data);
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

export interface UploadCvResult {
  cv: CvInfo;
  /** True when the file was saved but the AI skill-analysis step failed (BE keeps the old TechStack). */
  analysisFailed: boolean;
}

/**
 * Uploads (or replaces) the candidate's CV. Per the BE contract, if the AI
 * analysis step fails/times out the request still errors, but the file itself
 * is saved — so on any non-400 error we re-check via GET before giving up.
 */
export async function uploadCv(file: File): Promise<UploadCvResult> {
  const form = new FormData();
  form.append("File", file);

  let res;
  try {
    res = await apiClient.post("/api/candidate/cv", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } catch (err) {
    const response = (err as { response?: { status?: number; data?: { error?: string; detail?: string } } }).response;
    const message = response?.data?.error ?? response?.data?.detail;
    if (response?.status === 400) {
      throw new CvValidationError(message || "Invalid file");
    }
    const cv = await getCv().catch(() => null);
    if (cv) return { cv, analysisFailed: true };
    throw new Error(message || "Upload failed");
  }

  const cv = normalizeCv(res.data) ?? (await getCv());
  if (!cv) throw new Error("Upload succeeded but no CV info was returned");
  return { cv, analysisFailed: false };
}

export async function deleteCv(): Promise<void> {
  await apiClient.delete("/api/candidate/cv");
}
