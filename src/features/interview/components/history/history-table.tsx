"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Calendar, ArrowUpDown, Eye, Download, Trash2, Inbox, Loader2, AlertTriangle, ChevronLeft, ChevronRight, SearchX, Globe, GlobeOff, PenLine } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { useHrSubscription } from "@/features/hr/context/hr-subscription-context";
import { getLocalSessions, toGenerationSession } from "@/features/interview/utils/local-history";
import { getGenerationJobs, getGenerationPlans, getQuestionSetStatusByJob, deleteGenerationPlan, exportPlanQuestions, publishQuestionSet, unpublishQuestionSet } from "@/features/interview/services/interview.service";
import type { GenerationSession, GenerationStatus } from "@/features/interview/types/generation-session";
import { SessionStatusBadge } from "@/features/interview/components/history/session-status-badge";
import {
  portalCard,
  portalDivider,
  portalHeading,
  portalSubtext,
} from "@/shared/utils/portal-ui";

function PublishStatusBadge({ status, labels }: { status: "DRAFT" | "PUBLISHED"; labels: { published: string; draft: string } }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
      status === "PUBLISHED"
        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
    )}>
      {status === "PUBLISHED" ? <Globe size={11} /> : <PenLine size={11} />}
      {status === "PUBLISHED" ? labels.published : labels.draft}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function DeleteConfirmModal({
  session,
  onConfirm,
  onCancel,
  dm,
}: {
  session: GenerationSession;
  onConfirm: () => void;
  onCancel: () => void;
  dm: { title: string; subtitle: string; body: string; cancel: string; confirm: string };
}) {
  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 p-6 animate-fade-up">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <div>
            <h3 className={cn("text-base font-semibold", portalHeading)}>{dm.title}</h3>
            <p className={cn("text-xs mt-0.5", portalSubtext)}>{dm.subtitle}</p>
          </div>
        </div>

        <p className={cn("text-sm mb-1", portalSubtext)}>{dm.body}</p>
        <p className={cn("text-sm font-semibold px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mt-2", portalHeading)}>
          {session.jobTitle || "Untitled"}
        </p>

        <div className="flex gap-3 mt-5 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {dm.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center gap-2"
          >
            <Trash2 size={14} />
            {dm.confirm}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ColumnHeader({ label }: { label: string }) {
  return (
    <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap", portalSubtext)}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={11} className="text-gray-300 dark:text-gray-600" />
      </div>
    </th>
  );
}

const PAGE_SIZE = 10;

// Module-level constants — avoid re-creating on every render
function normalizeLevel(val: string): string {
  return val.toLowerCase() === "mid-level" ? "Medium" : val;
}

const IN_PROGRESS_STATUSES = new Set([
  "DRAFT", "PLAN_QUEUED", "CONFIRMED", "QUEUED",
  "QUESTION_QUEUED", "QUESTION_PROCESSING", "PROCESSING",
]);

interface HistoryTableProps {
  search?: string;
  role?: string;
  level?: string;
  experience?: string;
  status?: string;
  publishStatus?: string;
}

function resolveSessionDestination(session: GenerationSession): { type: "history" } | { type: "generate"; view: string; phase: string } {
  const status = session.status as string;

  // COMPLETED → always go to history review; questions are fetched on the detail page
  if (status === "COMPLETED") return { type: "history" };

  // Determine which Generate step to resume at
  let view = "polling";
  let phase = "plan";

  if (status === "PLAN_PROPOSED") {
    view = "plan_review"; phase = "plan";
  } else if (status === "DRAFT") {
    view = "draft_view"; phase = "questions";
  } else if (["CONFIRMED", "QUESTION_QUEUED", "QUESTION_PROCESSING"].includes(status)) {
    view = "polling"; phase = "questions";
  } else if (["QUEUED", "PROCESSING", "PLAN_QUEUED"].includes(status)) {
    view = "polling"; phase = "plan";
  } else if (status === "FAILED") {
    // If plan was already created before failure, it failed during question generation
    view = "failed"; phase = session.planDraft ? "questions" : "plan";
  } else {
    // COMPLETED but no questions yet (BE still saving) — wait in polling
    view = "polling"; phase = "questions";
  }

  return { type: "generate", view, phase };
}

export function HistoryTable({ search = "", role = "", level = "", experience = "", status = "", publishStatus = "" }: HistoryTableProps) {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const { hasFeature } = useHrSubscription();
  const router = useRouter();
  const ht = t.historyPage.table;
  const hs = t.hrSubscription;
  const dm = t.historyPage.deleteModal;
  const canExport = hasFeature("pdfExport");

  const [sessions, setSessions] = useState<GenerationSession[]>([]);
  const [publishMap, setPublishMap] = useState<Map<string, "DRAFT" | "PUBLISHED">>(new Map());
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [publishingTableId, setPublishingTableId] = useState<string | null>(null);
  const [unpublishingTableId, setUnpublishingTableId] = useState<string | null>(null);
  const [confirmSession, setConfirmSession] = useState<GenerationSession | null>(null);
  const [publishConfirmSession, setPublishConfirmSession] = useState<GenerationSession | null>(null);
  const [unpublishConfirmSession, setUnpublishConfirmSession] = useState<GenerationSession | null>(null);
  const [page, setPage] = useState(1);

  // Always-current ref so effects with [] deps never get a stale loadData
  const loadDataRef = useRef<() => void>(null!);

  async function confirmDelete() {
    if (!confirmSession) return;
    const id = confirmSession.id;
    setConfirmSession(null);
    setDeletingId(id);
    try {
      await deleteGenerationPlan(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      addToast("success", ht.deleteSuccess);
    } catch (err) {
      addToast("error", err instanceof Error && err.message ? err.message : ht.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  }

  async function confirmPublishFromTable() {
    const qsId = publishConfirmSession?.questionSetId;
    if (!publishConfirmSession || !qsId) return;
    const session = publishConfirmSession;
    setPublishConfirmSession(null);
    setPublishingTableId(session.id);
    try {
      await publishQuestionSet(qsId);
      setPublishMap(prev => new Map(prev).set(session.id, "PUBLISHED"));
      addToast("success", "Đăng bộ câu hỏi thành công");
    } catch (err) {
      addToast("error", err instanceof Error && err.message ? err.message : "Không thể đăng bộ câu hỏi");
    } finally {
      setPublishingTableId(null);
    }
  }

  async function confirmUnpublishFromTable() {
    const qsId = unpublishConfirmSession?.questionSetId;
    if (!unpublishConfirmSession || !qsId) return;
    const session = unpublishConfirmSession;
    setUnpublishConfirmSession(null);
    setUnpublishingTableId(session.id);
    try {
      await unpublishQuestionSet(qsId);
      setPublishMap(prev => new Map(prev).set(session.id, "DRAFT"));
      addToast("success", "Gỡ đăng bộ câu hỏi thành công");
    } catch (err) {
      addToast("error", err instanceof Error && err.message ? err.message : "Không thể gỡ đăng bộ câu hỏi");
    } finally {
      setUnpublishingTableId(null);
    }
  }

  function handleViewSession(session: GenerationSession) {
    const dest = resolveSessionDestination(session);
    if (dest.type === "history") {
      router.push(`/hr/history/${session.id}`);
      return;
    }
    // Resume in Generate wizard — write session keys then navigate
    localStorage.setItem("hr_gen_job",           session.id);
    localStorage.setItem("hr_gen_view",          dest.view);
    localStorage.setItem("hr_gen_polling_phase", dest.phase);
    if (session.planDraft) {
      localStorage.setItem("hr_gen_plan", JSON.stringify(session.planDraft));
    }
    router.push("/hr/generate");
  }

  async function handleExport(session: GenerationSession) {
    if (session.status !== "COMPLETED") return;
    setExportingId(session.id);
    try {
      await exportPlanQuestions(session.id, session.jobTitle || "interview-questions");
    } finally {
      setExportingId(null);
    }
  }

  function loadData() {
    const localSessions = getLocalSessions();
    // Sessions where backend save failed (no backendJobId) — show from local only
    const localOnly = localSessions
      .filter((s) => !s.backendJobId)
      .map(toGenerationSession);

    getQuestionSetStatusByJob().then(setPublishMap);

    // Fetch all jobs (all statuses including in-progress), then enrich with
    // level/jobTitle metadata from plans API for completed sessions.
    getGenerationJobs()
      .then((allJobs) => {
        const jobMap = new Map(allJobs.map((j) => [j.id, j]));

        // Enrich completed sessions with level data from plans API (best-effort)
        getGenerationPlans()
          .then((plans) => {
            for (const plan of plans) {
              const existing = jobMap.get(plan.id);
              if (existing) {
                jobMap.set(plan.id, {
                  ...existing,
                  jobTitle: plan.jobTitle || existing.jobTitle,
                  planDraft: existing.planDraft
                    ? { ...existing.planDraft, level: plan.planDraft?.level || existing.planDraft.level }
                    : plan.planDraft,
                });
              } else {
                jobMap.set(plan.id, plan);
              }
            }
          })
          .catch(() => { /* plans API failed — level may be empty, acceptable */ })
          .finally(() => {
            const merged = [...jobMap.values(), ...localOnly].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setSessions(merged);
            setLoading(false);
          });
      })
      .catch(() => {
        // Backend unavailable — show all local sessions as fallback
        setSessions(localSessions.map(toGenerationSession));
        setLoading(false);
      });
  }
  // Keep ref up-to-date so stale-closure effects always call the latest version
  loadDataRef.current = loadData;

  // ── Initial load + badge event listener ────────────────────────────────────
  useEffect(() => {
    loadDataRef.current();

    // When badge detects a status change: optimistically update the row IMMEDIATELY,
    // then reload from API to get fresh question counts.
    function handleJobStatusChanged(e: Event) {
      const { jobId, newStatus } = (e as CustomEvent<{ jobId: string | null; newStatus: GenerationStatus }>).detail ?? {};
      if (jobId && newStatus) {
        setSessions(prev =>
          prev.map(s => (s.id === jobId ? { ...s, status: newStatus } : s))
        );
      }
      // Full reload after 1s so question counts refresh too
      setTimeout(() => loadDataRef.current(), 1000);
    }

    window.addEventListener("hr:job-status-changed", handleJobStatusChanged);
    return () => window.removeEventListener("hr:job-status-changed", handleJobStatusChanged);
  }, []);

  // ── Self-polling: auto-refresh when in-progress sessions exist ─────────────
  const IN_PROGRESS_STATUSES = new Set([
    "QUEUED", "PROCESSING", "CONFIRMED",
    "QUESTION_QUEUED", "QUESTION_PROCESSING",
  ]);

  useEffect(() => {
    const hasActive = sessions.some(s => IN_PROGRESS_STATUSES.has(s.status as string));
    if (!hasActive) return;
    const t = setTimeout(() => loadDataRef.current(), 4000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]);

  // Reset to page 1 whenever any filter changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, [search, role, level, experience, status, publishStatus]);

  const filtered = sessions.filter((s) => {
    const sRole = (s.planDraft?.role ?? "").toLowerCase();
    const sLevel = s.planDraft?.level ?? "";
    const sTitle = (s.jobTitle ?? "").toLowerCase();
    const q = search.trim().toLowerCase();
    const normalizedLevel = normalizeLevel(sLevel);

    if (q && !sTitle.includes(q) && !sRole.includes(q)) return false;
    // Role: search planDraft.role OR jobTitle (BE may leave role empty)
    if (role && !sRole.includes(role.toLowerCase()) && !sTitle.includes(role.toLowerCase())) return false;
    // Difficulty: planDraft.level (normalized) is the source of truth
    if (level && normalizedLevel.toLowerCase() !== level.toLowerCase()) return false;
    // Experience: planDraft.level when it contains experience-level values
    if (experience && sLevel.toLowerCase() !== experience.toLowerCase()) return false;
    // Status: "IN_PROGRESS" groups all processing states
    if (status) {
      if (status === "IN_PROGRESS") {
        if (!IN_PROGRESS_STATUSES.has(s.status)) return false;
      } else {
        if (s.status !== status) return false;
      }
    }
    // Publish status: separate from generation status — a session only has one
    // once a question set has been saved as a draft/published from it.
    if (publishStatus && publishMap.get(s.id) !== publishStatus) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="hr-glass-card overflow-hidden animate-fade-up">
        <table className="w-full text-sm">
          <thead className={cn("border-b bg-gray-50/80 dark:bg-white/3", portalDivider)}>
            <tr>
              <ColumnHeader label={ht.jobTitle} />
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{ht.level}</th>
              <ColumnHeader label={ht.date} />
              <ColumnHeader label={ht.questions} />
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtext)}>Status</th>
              <th className={cn("px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{ht.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/70">
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className={i % 2 === 1 ? "bg-gray-50/40 dark:bg-gray-800/30" : ""}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
                    <div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" style={{ width: `${120 + (i % 3) * 40}px` }} />
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
                </td>
                <td className="px-4 py-3.5">
                  <div className="h-3.5 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-4 py-3.5">
                  <div className="h-3.5 w-6 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-4 py-3.5">
                  <div className="h-5 w-20 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex justify-end gap-1">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (sessions.length === 0) {
    return (
      <div className="hr-glass-card p-12 flex flex-col items-center gap-3 text-center animate-fade-up">
        <div className="w-12 h-12 rounded-xl hr-icon-box flex items-center justify-center">
          <Inbox size={22} className="text-[#7C3AED] dark:text-[#a78bff]" />
        </div>
        <p className={cn("text-sm font-medium", portalHeading)}>Chưa có bài nào</p>
        <p className={cn("text-xs", portalSubtext)}>Generate câu hỏi đầu tiên để thấy lịch sử tại đây.</p>
        <Link
          href="/hr/generate"
          className="mt-2 text-xs font-semibold text-[#7C3AED] dark:text-[#a78bff] hover:underline"
        >
          Đến trang Generate →
        </Link>
      </div>
    );
  }

  // Shared action buttons for both table and card views
  function ActionButtons({ session }: { session: GenerationSession }) {
    const publishStatus = publishMap.get(session.id);
    const canManagePublish = session.status === "COMPLETED" && publishStatus !== undefined;
    const isPublishing = publishingTableId === session.id;
    const isUnpublishing = unpublishingTableId === session.id;

    return (
      <>
        <button
          type="button"
          onClick={() => handleViewSession(session)}
          className="p-2 text-gray-400 dark:text-gray-500 hover:text-[#7C3AED] dark:hover:text-[#a78bff] hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-lg transition-colors inline-flex"
          title={ht.viewTitle}
        >
          <Eye size={14} />
        </button>

        {/* Publish button — only for DRAFT */}
        {canManagePublish && publishStatus === "DRAFT" && (
          <button
            type="button"
            onClick={() => session.questionSetId
              ? setPublishConfirmSession(session)
              : router.push(`/hr/history/${session.id}`)
            }
            disabled={isPublishing}
            title="Đăng bộ câu hỏi"
            className="p-2 rounded-lg transition-colors disabled:opacity-40 text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            {isPublishing
              ? <Loader2 size={14} className="animate-spin" />
              : <Globe size={14} />}
          </button>
        )}

        {/* Unpublish button — only for PUBLISHED */}
        {canManagePublish && publishStatus === "PUBLISHED" && (
          <button
            type="button"
            onClick={() => session.questionSetId
              ? setUnpublishConfirmSession(session)
              : router.push(`/hr/history/${session.id}`)
            }
            disabled={isUnpublishing}
            title="Gỡ đăng bộ câu hỏi"
            className="p-2 rounded-lg transition-colors disabled:opacity-40 text-emerald-500 dark:text-emerald-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
          >
            {isUnpublishing
              ? <Loader2 size={14} className="animate-spin" />
              : <GlobeOff size={14} />}
          </button>
        )}

        <button
          type="button"
          onClick={() => handleExport(session)}
          disabled={session.status !== "COMPLETED" || exportingId === session.id}
          title={session.status !== "COMPLETED" ? ht.exportDisabledTitle : ht.exportTitle}
          className={cn(
            "p-2 rounded-lg transition-colors",
            session.status === "COMPLETED"
              ? "text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-40"
              : "text-gray-200 dark:text-gray-700 cursor-not-allowed"
          )}
        >
          {exportingId === session.id
            ? <Loader2 size={14} className="animate-spin" />
            : <Download size={14} />}
        </button>
        <button
          type="button"
          onClick={() => setConfirmSession(session)}
          disabled={deletingId === session.id}
          title={ht.deleteTitle}
          className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors disabled:opacity-40"
        >
          {deletingId === session.id
            ? <Loader2 size={14} className="animate-spin" />
            : <Trash2 size={14} />}
        </button>
      </>
    );
  }

  function LevelBadge({ level }: { level: string }) {
    if (!level) return <span className="text-xs text-gray-300 dark:text-gray-600">—</span>;
    return (
      <span className={cn(
        "text-xs font-semibold px-2.5 py-1 rounded-md border",
        level === "Easy"
          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"
          : level === "Medium"
          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40"
          : level === "Hard"
          ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/40"
          : "bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600/40"
      )}>
        {level}
      </span>
    );
  }

  const emptyFilterRow = (
    <div className={cn("flex flex-col items-center gap-2 px-4 py-10 text-sm", portalSubtext)}>
      <SearchX size={20} className="text-gray-300 dark:text-gray-600" />
      Không tìm thấy kết quả phù hợp.
    </div>
  );

  return (
    <>
    {confirmSession && (
      <DeleteConfirmModal
        session={confirmSession}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmSession(null)}
        dm={dm}
      />
    )}

    {publishConfirmSession && createPortal(
      <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPublishConfirmSession(null)} />
        <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 p-6 animate-fade-up">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
              <Globe size={22} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className={cn("text-base font-semibold", portalHeading)}>Đăng bộ câu hỏi</h3>
              <p className={cn("text-xs mt-0.5", portalSubtext)}>Bộ câu hỏi sẽ hiển thị cho ứng viên</p>
            </div>
          </div>
          <p className={cn("text-sm font-semibold px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700", portalHeading)}>
            {publishConfirmSession.jobTitle || "Untitled"}
          </p>
          <div className="flex gap-3 mt-5 justify-end">
            <button
              type="button"
              onClick={() => setPublishConfirmSession(null)}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={confirmPublishFromTable}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-2"
            >
              <Globe size={14} />
              Xác nhận đăng
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {unpublishConfirmSession && createPortal(
      <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setUnpublishConfirmSession(null)} />
        <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 p-6 animate-fade-up">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
              <GlobeOff size={22} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className={cn("text-base font-semibold", portalHeading)}>Gỡ đăng bộ câu hỏi</h3>
              <p className={cn("text-xs mt-0.5", portalSubtext)}>Ứng viên sẽ không còn thấy bộ câu hỏi này</p>
            </div>
          </div>
          <p className={cn("text-sm font-semibold px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700", portalHeading)}>
            {unpublishConfirmSession.jobTitle || "Untitled"}
          </p>
          <div className="flex gap-3 mt-5 justify-end">
            <button
              type="button"
              onClick={() => setUnpublishConfirmSession(null)}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={confirmUnpublishFromTable}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors flex items-center gap-2"
            >
              <GlobeOff size={14} />
              Xác nhận gỡ đăng
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {/* ── Mobile card list (< md) ──────────────────────────────────────────── */}
    <div className="md:hidden space-y-3 animate-fade-up">
      {filtered.length === 0 ? emptyFilterRow : paginated.map((session) => {
        const sessionRole = session.planDraft?.role ?? "";
        const sessionLevel = normalizeLevel(session.planDraft?.level ?? "");
        const questionsCount = session.generatedQuestions?.length ?? 0;
        const title = session.jobTitle || (sessionRole ? `${sessionRole} Interview` : "Untitled");

        return (
          <div key={session.id} className={cn("rounded-xl p-4 border", portalCard)}>
            {/* Title row */}
            <div className="flex items-start gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg hr-icon-box flex items-center justify-center shrink-0 mt-0.5">
                <FileText size={14} className="text-[#7C3AED] dark:text-[#a78bff]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className={cn("font-semibold text-sm leading-snug block", portalHeading)}>{title}</span>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <SessionStatusBadge status={session.status} />
                  {publishMap.has(session.id) && (
                    <PublishStatusBadge
                      status={publishMap.get(session.id)!}
                      labels={{ published: t.reviewPage.statusPublished, draft: t.reviewPage.statusDraft }}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="mb-3 space-y-1.5">
              {/* Level + role badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <LevelBadge level={sessionLevel} />
                {sessionRole && (
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                    {sessionRole}
                  </span>
                )}
              </div>
              {/* Date · question count */}
              <div className="flex items-center gap-2">
                <span className={cn("text-xs flex items-center gap-1", portalSubtext)}>
                  <Calendar size={11} />
                  {formatDate(session.createdAt)}
                </span>
                <span className="text-gray-300 dark:text-gray-600 text-xs select-none">·</span>
                <span className={cn("text-xs font-medium", portalSubtext)}>
                  {questionsCount} {ht.questions}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 pt-2 border-t border-gray-100 dark:border-gray-800">
              <ActionButtons session={session} />
            </div>
          </div>
        );
      })}
    </div>

    {/* ── Desktop table (≥ md) ─────────────────────────────────────────────── */}
    <div className="hidden md:block hr-glass-card overflow-x-auto animate-fade-up">
      <table className="w-full text-sm">
        <thead className={cn("border-b bg-gray-50/80 dark:bg-white/3", portalDivider)}>
          <tr>
            <ColumnHeader label={ht.jobTitle} />
            <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{ht.level}</th>
            <ColumnHeader label={ht.date} />
            <ColumnHeader label={ht.questions} />
            <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtext)}>Status</th>
            <th className={cn("px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{ht.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/70">
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6}>{emptyFilterRow}</td>
            </tr>
          )}
          {paginated.map((session, rowIdx) => {
            const sessionRole = session.planDraft?.role ?? "";
            const sessionLevel = normalizeLevel(session.planDraft?.level ?? "");
            const questionsCount = session.generatedQuestions?.length ?? 0;
            const title = session.jobTitle || (sessionRole ? `${sessionRole} Interview` : "Untitled");
            const isEven = rowIdx % 2 === 1;

            return (
              <tr
                key={session.id}
                className={cn(
                  "hr-table-row transition-colors",
                  isEven && "bg-gray-50/40 dark:bg-gray-800/30"
                )}
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg hr-icon-box flex items-center justify-center shrink-0">
                      <FileText size={13} className="text-[#7C3AED] dark:text-[#a78bff]" />
                    </div>
                    <span className={cn("font-medium text-sm", portalHeading)}>{title}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <LevelBadge level={sessionLevel} />
                </td>
                <td className="px-4 py-3.5">
                  <div className={cn("flex items-center gap-1.5 text-sm", portalSubtext)}>
                    <Calendar size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
                    {formatDate(session.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className={cn("text-sm font-medium tabular-nums", portalHeading)}>{questionsCount}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <SessionStatusBadge status={session.status} />
                    {publishMap.has(session.id) && (
                      <PublishStatusBadge
                        status={publishMap.get(session.id)!}
                        labels={{ published: t.reviewPage.statusPublished, draft: t.reviewPage.statusDraft }}
                      />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-0.5">
                    <ActionButtons session={session} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* ── Pagination bar ───────────────────────────────────────────────────── */}
    {totalPages > 1 && (
      <div className="flex items-center justify-between gap-4 px-1 py-2">
        <p className={cn("text-xs", portalSubtext)}>
          {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} / {filtered.length} kết quả
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const isFirst = p === 1;
            const isLast = p === totalPages;
            const nearCurrent = Math.abs(p - safePage) <= 1;
            if (!isFirst && !isLast && !nearCurrent) {
              if (p === 2 || p === totalPages - 1) {
                return <span key={p} className={cn("text-xs px-0.5", portalSubtext)}>…</span>;
              }
              return null;
            }
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={cn(
                  "inline-flex h-8 min-w-8 px-2 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                  p === safePage
                    ? "bg-[#7C3AED] text-white shadow-sm"
                    : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                {p}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    )}
    </>
  );
}
