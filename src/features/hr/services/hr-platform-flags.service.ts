import { apiClient } from "@/core/api/http-client";

/** Fallback khi API lỗi / chưa load — khớp seed PlatformSettings. */
export const DEFAULT_MIN_QUESTIONS_TO_PUBLISH = 10;

export type HrPlatformFlags = {
  antiCheatEnabled: boolean;
  antiCheatMaxTabLeaves: number;
  /** Admin cấu hình — số câu tối thiểu HR được publish marketplace. */
  minQuestionsToPublish: number;
};

function asRecord(val: unknown): Record<string, unknown> | null {
  return val && typeof val === "object" ? (val as Record<string, unknown>) : null;
}

/** SuccessResp có thể trả `data` hoặc `Data` tùy serializer. */
function unwrapEnvelope(raw: unknown): Record<string, unknown> {
  const root = asRecord(raw);
  if (!root) return {};
  return asRecord(root.data) ?? asRecord(root.Data) ?? root;
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
}

function clampMinQuestions(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_MIN_QUESTIONS_TO_PUBLISH;
  return Math.min(100, Math.max(1, Math.trunc(n)));
}

/** SCRUM-464 / publish min: cờ Admin — HR đọc anti-cheat + min câu publish. */
export async function getHrPlatformFlags(): Promise<HrPlatformFlags> {
  const res = await apiClient.get("/api/hr/platform-flags");
  const data = unwrapEnvelope(res.data);

  const minRaw =
    pickNumber(data, "minQuestionsToPublish", "MinQuestionsToPublish") ??
    DEFAULT_MIN_QUESTIONS_TO_PUBLISH;

  return {
    antiCheatEnabled: Boolean(data.antiCheatEnabled ?? data.AntiCheatEnabled),
    antiCheatMaxTabLeaves:
      pickNumber(data, "antiCheatMaxTabLeaves", "AntiCheatMaxTabLeaves") ?? 3,
    minQuestionsToPublish: clampMinQuestions(minRaw),
  };
}
