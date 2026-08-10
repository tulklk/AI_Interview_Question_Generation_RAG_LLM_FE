/**
 * HR-side feedback for question sets.
 * GET /api/hr/question-sets/{id}/feedback
 * HR can only read feedback for question sets they own.
 */

import { apiClient } from "@/core/api/http-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HrFeedbackEntry {
  id: string;
  rating: number;
  comment: string;
  candidateName: string;
  candidateEmail?: string;
  /** Profile picture URL — null when the user has no avatar */
  avatarUrl?: string;
  createdAt: string;
}

export interface HrFeedbackSummary {
  items: HrFeedbackEntry[];
  totalCount: number;
  averageRating: number | null;
}

// ── Normalizer ────────────────────────────────────────────────────────────────

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" ? v : fallback;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function pickStr(d: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    if (typeof d[k] === "string" && (d[k] as string).length > 0) return d[k] as string;
  }
  return undefined;
}

function normalizeEntry(raw: unknown): HrFeedbackEntry {
  const d = asRecord(raw);

  // Avatar may be on the entry directly, or nested inside a candidate/user sub-object
  const candidateObj = asRecord(d.candidate ?? d.user ?? d.author ?? {});

  const avatarUrl =
    pickStr(d, "avatarUrl", "profilePictureUrl", "photoUrl", "avatar", "picture") ??
    pickStr(candidateObj, "avatarUrl", "profilePictureUrl", "photoUrl", "avatar", "picture");

  return {
    id: str(d.id),
    rating: num(d.rating),
    comment: str(d.comment ?? d.content),
    candidateName: str(
      d.candidateName ?? d.authorName ?? d.userName ??
      candidateObj.fullName ?? candidateObj.name ?? ""
    ),
    candidateEmail: pickStr(d, "candidateEmail", "authorEmail", "email") ??
      pickStr(candidateObj, "email"),
    avatarUrl,
    createdAt: str(d.createdAt ?? d.submittedAt),
  };
}

// ── API ───────────────────────────────────────────────────────────────────────

export async function getHrQuestionSetFeedback(
  questionSetId: string,
  page = 1,
  pageSize = 20
): Promise<HrFeedbackSummary> {
  const res = await apiClient.get(
    `/api/hr/question-sets/${questionSetId}/feedback`,
    { params: { Page: page, PageSize: pageSize } }
  );

  // Unwrap standard { data: { ... } } envelope
  const root = asRecord(res.data);
  const payload = root.data ? asRecord(root.data) : root;

  // Items may be under payload.items / payload.data / directly an array
  const rawItems: unknown[] = Array.isArray(payload.items)
    ? (payload.items as unknown[])
    : Array.isArray(payload.data)
      ? (payload.data as unknown[])
      : Array.isArray(res.data)
        ? (res.data as unknown[])
        : [];

  const totalCount =
    typeof payload.totalCount === "number" ? payload.totalCount
    : typeof payload.total === "number" ? payload.total
    : rawItems.length;

  const averageRating =
    typeof payload.averageRating === "number" ? payload.averageRating
    : typeof payload.avgRating === "number" ? payload.avgRating
    : rawItems.length > 0
      ? rawItems.reduce<number>((sum, r) => sum + num(asRecord(r).rating), 0) / rawItems.length
      : null;

  return {
    items: rawItems.map(normalizeEntry),
    totalCount,
    averageRating,
  };
}
