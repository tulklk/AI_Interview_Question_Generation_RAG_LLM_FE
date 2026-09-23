import { apiClient } from "@/core/api/http-client";

/** Fallback khi API lỗi / chưa load — khớp seed PlatformSettings. */
export const DEFAULT_MIN_QUESTIONS_TO_PUBLISH = 10;

export type HrPlatformFlags = {
  antiCheatEnabled: boolean;
  antiCheatMaxTabLeaves: number;
  /** Admin cấu hình — số câu tối thiểu HR được publish marketplace. */
  minQuestionsToPublish: number;
};

function clampMinQuestions(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_MIN_QUESTIONS_TO_PUBLISH;
  return Math.min(100, Math.max(1, Math.trunc(n)));
}

/** SCRUM-464 / publish min: cờ Admin — HR đọc anti-cheat + min câu publish. */
export async function getHrPlatformFlags(): Promise<HrPlatformFlags> {
  const res = await apiClient.get("/api/hr/platform-flags");
  const raw = res.data as Record<string, unknown>;
  const data = (raw?.data && typeof raw.data === "object" ? raw.data : raw) as Record<
    string,
    unknown
  >;

  const minRaw =
    typeof data.minQuestionsToPublish === "number"
      ? data.minQuestionsToPublish
      : typeof data.MinQuestionsToPublish === "number"
        ? data.MinQuestionsToPublish
        : DEFAULT_MIN_QUESTIONS_TO_PUBLISH;

  return {
    antiCheatEnabled: Boolean(data.antiCheatEnabled ?? data.AntiCheatEnabled),
    antiCheatMaxTabLeaves:
      typeof data.antiCheatMaxTabLeaves === "number"
        ? data.antiCheatMaxTabLeaves
        : typeof data.AntiCheatMaxTabLeaves === "number"
          ? data.AntiCheatMaxTabLeaves
          : 3,
    minQuestionsToPublish: clampMinQuestions(minRaw),
  };
}
