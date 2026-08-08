import { apiClient } from "@/core/api/http-client";

export interface PlatformSettings {
  minQuestionsToPublish?: number;
  maxPinnedSets?: number;
  minAttemptsForTrending?: number;
  platformName?: string;
  defaultQuestionCount?: number;
  maxJdsPerDay?: number;
  sessionTimeout?: number;
}

function normalize(raw: unknown): PlatformSettings {
  if (!raw || typeof raw !== "object") return {};
  const d = raw as Record<string, unknown>;
  const data = (d.data && typeof d.data === "object" ? d.data : d) as Record<string, unknown>;

  return {
    minQuestionsToPublish:
      typeof data.minQuestionsToPublish === "number" ? data.minQuestionsToPublish :
      typeof data.minQuestionToPublish === "number" ? data.minQuestionToPublish :
      typeof data.minimumQuestionsToPublish === "number" ? data.minimumQuestionsToPublish :
      undefined,
    maxPinnedSets: typeof data.maxPinnedSets === "number" ? data.maxPinnedSets : undefined,
    minAttemptsForTrending:
      typeof data.minAttemptsForTrending === "number" ? data.minAttemptsForTrending : undefined,
    platformName: typeof data.platformName === "string" ? data.platformName : undefined,
    defaultQuestionCount:
      typeof data.defaultQuestionCount === "number" ? data.defaultQuestionCount : undefined,
    maxJdsPerDay:
      typeof data.maxJdsPerDay === "number" ? data.maxJdsPerDay :
      typeof data.maxJDsPerDay === "number" ? data.maxJDsPerDay :
      undefined,
    sessionTimeout: typeof data.sessionTimeout === "number" ? data.sessionTimeout : undefined,
  };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const res = await apiClient.get("/api/admin/platform-settings");
  return normalize(res.data);
}

export async function updatePlatformSettings(settings: PlatformSettings): Promise<void> {
  await apiClient.put("/api/admin/platform-settings", {
    minQuestionsToPublish: settings.minQuestionsToPublish,
    maxPinnedSets: settings.maxPinnedSets,
    minAttemptsForTrending: settings.minAttemptsForTrending,
    // Các field UI-only vẫn gửi nếu BE bỏ qua (backward compatible)
    platformName: settings.platformName,
    defaultQuestionCount: settings.defaultQuestionCount,
    maxJdsPerDay: settings.maxJdsPerDay,
    sessionTimeout: settings.sessionTimeout,
  });
}
