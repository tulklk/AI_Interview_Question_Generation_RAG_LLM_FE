"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Calendar, ArrowUpDown, Eye, Download, Trash2, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { useHrSubscription } from "@/context/hr-subscription-context";
import { getLocalSessions, toGenerationSession } from "@/lib/local-history";
import { getGenerationPlans } from "@/lib/api/generation";
import type { GenerationSession } from "@/types/generation-session";
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
  const canExport = hasFeature("pdfExport");

  const [sessions, setSessions] = useState<GenerationSession[]>([]);

  useEffect(() => {
    const localSessions = getLocalSessions();
    // Sessions where backend save failed (no backendJobId) — show from local only
    const localOnly = localSessions
      .filter((s) => !s.backendJobId)
      .map(toGenerationSession);

    // Merge with backend sessions; plans API has full metadata (jobTitle, role, level)
    getGenerationPlans()
      .then((backendSessions) => {
        const merged = [...backendSessions, ...localOnly].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setSessions(merged);
      })
      .catch(() => {
        // Backend unavailable — show all local sessions as fallback
        setSessions(localSessions.map(toGenerationSession));
      });
  }, []);

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
      <div className={cn(portalCard, "shadow-sm p-12 flex flex-col items-center gap-3 text-center")}>
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Inbox size={22} className="text-gray-400 dark:text-gray-500" />
        </div>
        <p className={cn("text-sm font-medium", portalHeading)}>Chưa có bài nào</p>
        <p className={cn("text-xs", portalSubtext)}>Generate câu hỏi đầu tiên để thấy lịch sử tại đây.</p>
        <Link
          href="/hr/generate"
          className="mt-2 text-xs font-semibold text-primary hover:underline"
        >
          Đến trang Generate →
        </Link>
      </div>
    );
  }

  return (
    <div className={cn(portalCard, "shadow-sm overflow-hidden animate-fade-up")}>
      <table className="w-full text-sm">
        <thead className={cn("border-b", portalDivider)}>
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
        <tbody className={cn("divide-y", portalDivider)}>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={7} className={cn("px-4 py-10 text-center text-sm", portalSubtext)}>
                Không tìm thấy kết quả phù hợp.
              </td>
            </tr>
          )}
          {filtered.map((session) => {
            const sessionRole = session.planDraft?.role ?? "—";
            const sessionLevel = session.planDraft?.level ?? "—";
            const palette = rolePalette(sessionRole);
            const questionsCount = session.generatedQuestions?.length ?? 0;
            const title = session.jobTitle || (sessionRole !== "—" ? `${sessionRole} Interview` : "Untitled");

            return (
              <tr key={session.id} className={cn("transition-colors", portalTableRow)}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-7 h-7 rounded-lg border border-gray-100 dark:border-gray-700 flex items-center justify-center shrink-0", portalIconWell)}>
                      <FileText size={13} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <span className={cn("font-medium", portalHeading)}>{title}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md", palette.bg, palette.text)}>
                    {sessionRole}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300")}>
                    {sessionLevel}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className={cn("flex items-center gap-1.5", portalSubtext)}>
                    <Calendar size={13} className="text-gray-300 dark:text-gray-600 shrink-0" />
                    {formatDate(session.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className={cn("text-xs font-medium", portalSubtext)}>{questionsCount}</span>
                </td>
                <td className="px-4 py-3.5">
                  <SessionStatusBadge status={session.status} />
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/hr/history/${session.id}`}
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors inline-flex"
                    >
                      <Eye size={14} />
                    </Link>
                    <button
                      type="button"
                      disabled={!canExport}
                      title={!canExport ? hs.lockedExport : undefined}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        canExport
                          ? "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                          : "text-gray-200 dark:text-gray-700 cursor-not-allowed"
                      )}
                    >
                      <Download size={14} />
                    </button>
                    <button className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
