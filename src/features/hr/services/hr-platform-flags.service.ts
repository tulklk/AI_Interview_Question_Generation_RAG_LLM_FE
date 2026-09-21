import { apiClient } from "@/core/api/http-client";

export type HrPlatformFlags = {
  antiCheatEnabled: boolean;
  antiCheatMaxTabLeaves: number;
};

/** SCRUM-464: công tắc anti-cheat Admin — HR đọc để khóa toggle trên bộ Tuyển. */
export async function getHrPlatformFlags(): Promise<HrPlatformFlags> {
  const res = await apiClient.get("/api/hr/platform-flags");
  const raw = res.data as Record<string, unknown>;
  const data = (raw?.data && typeof raw.data === "object" ? raw.data : raw) as Record<
    string,
    unknown
  >;
  return {
    antiCheatEnabled: Boolean(data.antiCheatEnabled ?? data.AntiCheatEnabled),
    antiCheatMaxTabLeaves:
      typeof data.antiCheatMaxTabLeaves === "number"
        ? data.antiCheatMaxTabLeaves
        : typeof data.AntiCheatMaxTabLeaves === "number"
          ? data.AntiCheatMaxTabLeaves
          : 3,
  };
}
