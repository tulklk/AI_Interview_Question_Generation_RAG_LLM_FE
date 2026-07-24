import { apiClient } from "@/core/api/http-client";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface CandidateInvitation {
  id: string;
  companyName: string;
  companyLogoUrl?: string | null;
  questionSetId: string;
  questionSetTitle: string;
  message: string | null;
  status: InvitationStatus;
  createdAt: string | null;
  respondedAt: string | null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickNullableStr(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") return v;
    if (v === null) return null;
  }
  return null;
}

function normalizeStatus(raw: string): InvitationStatus {
  const u = raw.toUpperCase();
  return u === "ACCEPTED" || u === "REJECTED" ? u : "PENDING";
}

function normalizeInvitation(raw: unknown): CandidateInvitation | null {
  const src = asRecord(raw);
  if (!src) return null;
  const id = pickStr(src, "id", "invitationId");
  if (!id) return null;
  return {
    id,
    companyName: pickStr(src, "companyName", "company"),
    companyLogoUrl: pickNullableStr(src, "companyLogo", "companyLogoUrl"),
    questionSetId: pickStr(src, "questionSetId"),
    questionSetTitle: pickStr(src, "questionSetTitle", "setTitle", "title"),
    message: pickNullableStr(src, "message"),
    status: normalizeStatus(pickStr(src, "status") || "PENDING"),
    createdAt: pickNullableStr(src, "createdAt", "sentAt"),
    respondedAt: pickNullableStr(src, "respondedAt"),
  };
}

function extractList(res: unknown): unknown[] {
  const r = asRecord(res);
  if (!r) return Array.isArray(res) ? res : [];
  const data = asRecord(r.data) ?? r;
  if (Array.isArray(data)) return data;
  const items = data.items ?? data.data ?? data.invitations;
  return Array.isArray(items) ? items : [];
}

export async function listInvitations(): Promise<CandidateInvitation[]> {
  const res = await apiClient.get("/api/candidate/invitations");
  return extractList(res.data)
    .map(normalizeInvitation)
    .filter((i): i is CandidateInvitation => i !== null);
}

export async function acceptInvitation(id: string): Promise<void> {
  await apiClient.post(`/api/candidate/invitations/${id}/accept`);
}

export async function rejectInvitation(id: string): Promise<void> {
  await apiClient.post(`/api/candidate/invitations/${id}/reject`);
}
