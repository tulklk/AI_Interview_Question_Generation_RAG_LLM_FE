import { apiClient } from "@/core/api/http-client";
import type { HistoryQuestionSetItem, HistoryPublishStatus } from "@/features/hr/types/history-question-set";

function unwrapData(data: unknown): unknown {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: unknown }).data;
  }
  return data;
}

function asRecord(val: unknown): Record<string, unknown> | null {
  return val && typeof val === "object" ? (val as Record<string, unknown>) : null;
}

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

function normalizeItem(raw: unknown): HistoryQuestionSetItem | null {
  const src = asRecord(raw);
  if (!src) return null;
  const questionSetId = pickStr(src, "questionSetId", "id");
  if (!questionSetId) return null;
  const statusRaw = pickStr(src, "status").toUpperCase();
  const status: HistoryPublishStatus = statusRaw === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const questionCount =
    typeof src.questionCount === "number"
      ? src.questionCount
      : typeof src.questionsCount === "number"
        ? src.questionsCount
        : 0;
  return {
    questionSetId,
    title: pickStr(src, "title", "jobTitle") || "Untitled",
    status,
    questionCount,
    isBookmarked: Boolean(src.isBookmarked),
    sourceProjectId: pickStr(src, "sourceProjectId") || null,
    jobId: pickStr(src, "jobId", "sourceJobId") || null,
    savedAt: pickStr(src, "savedAt", "createdAt") || new Date().toISOString(),
    publishedAt: pickStr(src, "publishedAt") || null,
  };
}

function extractBeErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: { error?: string; detail?: string; message?: string } } })
    ?.response?.data;
  return data?.error ?? data?.detail ?? data?.message ?? "";
}

/** SCRUM-391: danh sách bộ câu hỏi HR sở hữu cho trang History. */
export async function listHistoryQuestionSets(): Promise<HistoryQuestionSetItem[]> {
  const { data } = await apiClient.get("/api/hr/question-sets");
  const root = unwrapData(data);
  const arr = Array.isArray(root)
    ? root
    : Array.isArray((root as { items?: unknown[] })?.items)
      ? (root as { items: unknown[] }).items
      : [];
  return arr.map(normalizeItem).filter((x): x is HistoryQuestionSetItem => x !== null);
}

export async function exportHistoryQuestionSet(questionSetId: string, fileName: string): Promise<void> {
  const { data } = await apiClient.get(`/api/hr/question-sets/${questionSetId}/export`, {
    responseType: "arraybuffer",
  });
  const blob = new Blob([data as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName.replace(/[^a-z0-9_\- ]/gi, "_") || "question-set"}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function deleteHistoryQuestionSet(questionSetId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/hr/question-sets/${questionSetId}`);
  } catch (err) {
    throw new Error(extractBeErrorMessage(err) || "Không thể xóa bộ câu hỏi.");
  }
}
