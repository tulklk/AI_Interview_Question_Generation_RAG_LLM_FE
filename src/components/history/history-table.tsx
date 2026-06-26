"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { FileText, Calendar, ArrowUpDown, Eye, Download, Trash2, Inbox, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { useHrSubscription } from "@/context/hr-subscription-context";
import { getLocalSessions, toGenerationSession } from "@/lib/local-history";
import { getGenerationJobs, getGenerationPlans, deleteGenerationPlan, exportPlanQuestions } from "@/lib/api/generation";
import type { GenerationSession, GenerationStatus } from "@/types/generation-session";
import { SessionStatusBadge } from "@/components/history/session-status-badge";
import {
  portalCard,
  portalDivider,
  portalHeading,
  portalIconWell,
  portalSubtext,
  portalTableRow,
} from "@/lib/portal-ui";

const ROLE_PALETTES = [
  { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40" },
  { text: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40" },
  { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40" },
  { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/40" },
  { text: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-950/40" },
];

function rolePalette(role: string) {
  if (!role) return ROLE_PALETTES[0];
  const idx = Math.abs(role.charCodeAt(0)) % ROLE_PALETTES.length;
  return ROLE_PALETTES[idx];
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

interface HistoryTableProps {
  search?: string;
  role?: string;
  level?: string;
}

export function HistoryTable({ search = "", role = "", level = "" }: HistoryTableProps) {
  const { t } = useLanguage();
  const { hasFeature } = useHrSubscription();
  const ht = t.historyPage.table;
  const hs = t.hrSubscription;
  const dm = t.historyPage.deleteModal;
  const canExport = hasFeature("pdfExport");

  const [sessions, setSessions] = useState<GenerationSession[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [confirmSession, setConfirmSession] = useState<GenerationSession | null>(null);

  // Always-current ref so effects with [] deps never get a stale loadData
  const loadDataRef = useRef<() => void>(null!);

  async function confirmDelete() {
    if (!confirmSession) return;
    const id = confirmSession.id;
    setConfirmSession(null);
    setDeletingId(id);
    const ok = await deleteGenerationPlan(id);
    if (ok) setSessions(prev => prev.filter(s => s.id !== id));
    setDeletingId(null);
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
          });
      })
      .catch(() => {
        // Backend unavailable — show all local sessions as fallback
        setSessions(localSessions.map(toGenerationSession));
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

  const filtered = sessions.filter((s) => {
    const sRole = s.planDraft?.role ?? "";
    const sLevel = s.planDraft?.level ?? "";
    const sTitle = s.jobTitle ?? "";
    const q = search.trim().toLowerCase();
    if (q && !sTitle.toLowerCase().includes(q) && !sRole.toLowerCase().includes(q)) return false;
    if (role && !sRole.toLowerCase().includes(role.toLowerCase())) return false;
    if (level && sLevel.toLowerCase() !== level.toLowerCase()) return false;
    return true;
  });

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
    <div className="hr-glass-card overflow-hidden animate-fade-up">
      <table className="w-full text-sm">
        <thead className={cn("border-b bg-gray-50/80 dark:bg-white/3", portalDivider)}>
          <tr>
            <ColumnHeader label={ht.jobTitle} />
            <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{ht.role}</th>
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
              <td colSpan={7} className={cn("px-4 py-10 text-center text-sm", portalSubtext)}>
                Không tìm thấy kết quả phù hợp.
              </td>
            </tr>
          )}
          {filtered.map((session, rowIdx) => {
            const sessionRole = session.planDraft?.role ?? "";
            const sessionLevel = session.planDraft?.level ?? "";
            const palette = rolePalette(sessionRole || "a");
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
                  {sessionRole ? (
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-md", palette.bg, palette.text)}>
                      {sessionRole}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  {sessionLevel ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600/40">
                      {sessionLevel}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                  )}
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
                  <SessionStatusBadge status={session.status} />
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-0.5">
                    <Link
                      href={`/hr/history/${session.id}`}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-[#7C3AED] dark:hover:text-[#a78bff] hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-lg transition-colors inline-flex"
                      title={ht.viewTitle}
                    >
                      <Eye size={14} />
                    </Link>
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
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}
