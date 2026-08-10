/**
 * Feedback service — /api/feedbacks
 *
 * Endpoints:
 *   GET    /api/feedbacks               Public list of approved feedbacks (landing page)
 *   POST   /api/feedbacks               Submit new feedback (HR / Candidate)
 *   GET    /api/feedbacks/admin         Admin: paginated list of all statuses
 *   PUT    /api/feedbacks/{id}          Admin: update content / rating
 *   DELETE /api/feedbacks/{id}          Admin: soft-delete
 *   PATCH  /api/feedbacks/{id}/status   Admin: approve / reject (Pending → Approved | Rejected)
 */

import { apiClient } from "@/core/api/http-client";

const BASE = "/api/feedbacks";

// ── Helpers ───────────────────────────────────────────────────────────────────

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function extractData(raw: unknown): Record<string, unknown> {
  const root = asRecord(raw);
  return typeof root.data === "object" && root.data !== null
    ? asRecord(root.data)
    : root;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number") return v;
  }
  return 0;
}

// ── Domain types ──────────────────────────────────────────────────────────────

export type FeedbackStatus = "Pending" | "Approved" | "Rejected";

export interface PublicFeedback {
  id: string;
  authorName: string;
  /** Optional avatar URL */
  authorAvatarUrl?: string;
  /** Optional job title / role label shown under the name */
  authorRole?: string;
  content: string;
  /** 1–5 star rating */
  rating: number;
  createdAt: string;
}

export interface AdminFeedback extends PublicFeedback {
  status: FeedbackStatus;
  authorEmail?: string;
}

export interface PaginatedFeedbacks {
  items: AdminFeedback[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SubmitFeedbackPayload {
  content: string;
  /** Integer 1–5 */
  rating: number;
}

export interface AdminUpdateFeedbackPayload {
  content?: string;
  rating?: number;
}

// ── Normalizers ───────────────────────────────────────────────────────────────

function normalizePublicFeedback(raw: unknown): PublicFeedback {
  const d = asRecord(raw);
  return {
    id: pickString(d, "id"),
    authorName: pickString(d, "authorName", "userName", "name"),
    authorAvatarUrl:
      typeof d.authorAvatarUrl === "string" ? d.authorAvatarUrl
      : typeof d.avatarUrl === "string" ? d.avatarUrl
      : undefined,
    authorRole:
      typeof d.authorRole === "string" ? d.authorRole
      : typeof d.authorTitle === "string" ? d.authorTitle
      : typeof d.role === "string" ? d.role
      : undefined,
    content: pickString(d, "content", "message", "text"),
    rating: pickNumber(d, "rating", "stars"),
    createdAt: pickString(d, "createdAt", "submittedAt"),
  };
}

function normalizeAdminFeedback(raw: unknown): AdminFeedback {
  const pub = normalizePublicFeedback(raw);
  const d = asRecord(raw);
  return {
    ...pub,
    status: (pickString(d, "status") as FeedbackStatus) || "Pending",
    authorEmail:
      typeof d.authorEmail === "string" ? d.authorEmail
      : typeof d.email === "string" ? d.email
      : undefined,
  };
}

function extractList(raw: unknown): unknown[] {
  const top = asRecord(raw);
  // { data: [...] } — array sits directly in data (public endpoint shape)
  if (Array.isArray(top.data)) return top.data as unknown[];
  // { data: { items: [...] } } or { items: [...] } — paginated admin shape
  const d = typeof top.data === "object" && top.data !== null
    ? asRecord(top.data)
    : top;
  if (Array.isArray(d.items)) return d.items;
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(raw)) return raw as unknown[];
  return [];
}

function extractTotal(raw: unknown): number {
  const top = asRecord(raw);
  const d = typeof top.data === "object" && top.data !== null
    ? asRecord(top.data)
    : top;
  if (typeof d.total === "number") return d.total;
  if (typeof d.totalCount === "number") return d.totalCount;
  if (typeof d.count === "number") return d.count;
  return 0;
}

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * GET /api/feedbacks
 * Public — returns approved feedbacks for the landing page.
 */
export async function getPublicFeedbacks(): Promise<PublicFeedback[]> {
  const res = await apiClient.get(BASE);
  const list = extractList(res.data);
  return list.map(normalizePublicFeedback);
}

/**
 * POST /api/feedbacks
 * HR / Candidate — submit a new feedback (starts in Pending state).
 */
export async function submitFeedback(
  payload: SubmitFeedbackPayload
): Promise<PublicFeedback> {
  const res = await apiClient.post(BASE, payload);
  return normalizePublicFeedback(extractData(res.data));
}

/**
 * GET /api/feedbacks/admin
 * Admin — paginated list of feedbacks (all statuses).
 *
 * Query params (PascalCase as required by BE):
 *   Page, PageSize, Status ("Pending"|"Approved"|"Rejected"),
 *   Role ("HR"|"Candidate"), Search (free-text)
 */
export async function getAdminFeedbacks(params?: {
  page?: number;
  pageSize?: number;
  status?: FeedbackStatus;
  role?: "HR" | "Candidate";
  search?: string;
}): Promise<PaginatedFeedbacks> {
  const { page = 1, pageSize = 20, status, role, search } = params ?? {};
  // Swagger uses PascalCase for all query param names
  const qs = new URLSearchParams({
    Page: String(page),
    PageSize: String(pageSize),
    ...(status ? { Status: status } : {}),
    ...(role ? { Role: role } : {}),
    ...(search ? { Search: search } : {}),
  });
  const res = await apiClient.get(`${BASE}/admin?${qs}`);
  const items = extractList(res.data).map(normalizeAdminFeedback);
  const total = extractTotal(res.data);
  return { items, total, page, pageSize };
}

/**
 * PUT /api/feedbacks/{id}
 * Admin — update content and/or rating of a feedback.
 */
export async function adminUpdateFeedback(
  id: string,
  payload: AdminUpdateFeedbackPayload
): Promise<AdminFeedback> {
  const res = await apiClient.put(`${BASE}/${id}`, payload);
  return normalizeAdminFeedback(extractData(res.data));
}

/**
 * DELETE /api/feedbacks/{id}
 * Admin — soft-delete a feedback.
 */
export async function adminDeleteFeedback(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

/**
 * PATCH /api/feedbacks/{id}/status
 * Admin — approve or reject a Pending feedback.
 */
export async function adminUpdateFeedbackStatus(
  id: string,
  status: "Approved" | "Rejected"
): Promise<AdminFeedback> {
  const res = await apiClient.patch(`${BASE}/${id}/status`, { status });
  return normalizeAdminFeedback(extractData(res.data));
}
