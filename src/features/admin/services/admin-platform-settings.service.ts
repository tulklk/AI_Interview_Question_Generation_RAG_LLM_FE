import { apiClient } from "@/core/api/http-client";

export interface PlatformSettings {
  minQuestionsToPublish?: number;
  maxPinnedSets?: number;
  minAttemptsForTrending?: number;
  /** SCRUM-446 */
  antiCheatEnabled?: boolean;
  antiCheatMaxTabLeaves?: number;
  platformName?: string;
  defaultQuestionCount?: number;
  maxJdsPerDay?: number;
  sessionTimeout?: number;
}

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

function normalize(raw: unknown): PlatformSettings {
  const data = unwrapEnvelope(raw);

  return {
    minQuestionsToPublish: pickNumber(
      data,
      "minQuestionsToPublish",
      "MinQuestionsToPublish",
      "minQuestionToPublish",
      "minimumQuestionsToPublish"
    ),
    maxPinnedSets: pickNumber(data, "maxPinnedSets", "MaxPinnedSets"),
    minAttemptsForTrending: pickNumber(
      data,
      "minAttemptsForTrending",
      "MinAttemptsForTrending"
    ),
    antiCheatEnabled:
      typeof data.antiCheatEnabled === "boolean"
        ? data.antiCheatEnabled
        : typeof data.AntiCheatEnabled === "boolean"
          ? data.AntiCheatEnabled
          : undefined,
    antiCheatMaxTabLeaves: pickNumber(
      data,
      "antiCheatMaxTabLeaves",
      "AntiCheatMaxTabLeaves"
    ),
    platformName:
      typeof data.platformName === "string"
        ? data.platformName
        : typeof data.PlatformName === "string"
          ? data.PlatformName
          : undefined,
    defaultQuestionCount: pickNumber(
      data,
      "defaultQuestionCount",
      "DefaultQuestionCount"
    ),
    maxJdsPerDay: pickNumber(data, "maxJdsPerDay", "maxJDsPerDay", "MaxJdsPerDay"),
    sessionTimeout: pickNumber(data, "sessionTimeout", "SessionTimeout"),
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
    antiCheatEnabled: settings.antiCheatEnabled ?? false,
    antiCheatMaxTabLeaves: settings.antiCheatMaxTabLeaves ?? 3,
    // Các field UI-only vẫn gửi nếu BE bỏ qua (backward compatible)
    platformName: settings.platformName,
    defaultQuestionCount: settings.defaultQuestionCount,
    maxJdsPerDay: settings.maxJdsPerDay,
    sessionTimeout: settings.sessionTimeout,
  });
}
