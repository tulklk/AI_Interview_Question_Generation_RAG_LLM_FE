import { apiClient } from "@/core/api/http-client";

function asRecord(val: unknown): Record<string, unknown> | null {
  return val && typeof val === "object" ? (val as Record<string, unknown>) : null;
}

function pickBoolean(obj: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean") return v;
  }
  return undefined;
}

/** BE defaults to true when the candidate has never changed this setting. */
export async function getPrivacySettings(): Promise<boolean> {
  const res = await apiClient.get("/api/candidate/privacy-settings");
  const root = asRecord(res.data);
  const src = (root ? asRecord(root.data) : null) ?? root;
  const allow = src ? pickBoolean(src, "allowRecruiterRecommendation") : undefined;
  return allow ?? true;
}

export async function updatePrivacySettings(allowRecruiterRecommendation: boolean): Promise<void> {
  await apiClient.put("/api/candidate/privacy-settings", { allowRecruiterRecommendation });
}
