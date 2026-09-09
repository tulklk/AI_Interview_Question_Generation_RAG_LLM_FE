"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Mail,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import type { Practitioner, PractitionerSessionStatus } from "@/features/interview/services/interview.service";
import { InviteCandidateModal } from "@/features/hr/components/recommendations/invite-candidate-modal";
import { invitePractitioner } from "@/features/hr/services/hr-talent.service";

const PAGE_SIZE = 7;

const iconBtn =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-200";

const thCls =
  "h-10 px-3 align-middle text-[11px] font-semibold tracking-wide text-gray-500 dark:text-gray-400";

const tdCls = "h-12 px-3 align-middle";

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-rose-500",
];

function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) {
    return <span className={cn("tabular-nums", portalSubtext)}>—</span>;
  }
  const color =
    score >= 85
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 70
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  return <span className={cn("text-[14px] font-bold tabular-nums", color)}>{score}</span>;
}

function StatusBadge({
  status,
  labels,
}: {
  status: PractitionerSessionStatus;
  labels: Record<string, string>;
}) {
  const styles: Record<PractitionerSessionStatus, string> = {
    IN_PROGRESS: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    COMPLETED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    ABANDONED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  const text: Record<PractitionerSessionStatus, string> = {
    IN_PROGRESS: labels.inProgress,
    COMPLETED: labels.completed,
    ABANDONED: labels.abandoned,
  };
  return (
    <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", styles[status])}>
      {text[status]}
    </span>
  );
}

/** SCRUM-440: bảng practitioners nhúng trong hub (không chrome publish). */
export function PublishedHubPractitioners({
  items,
  questionSetId,
  questionSetTitle,
  limit,
}: {
  items: Practitioner[];
  questionSetId: string;
  questionSetTitle: string;
  /** Nếu set — chỉ hiện N dòng đầu (overview preview), không pagination. */
  limit?: number;
}) {
  const { t, lang } = useLanguage();
  const p = t.practitionersPage;
  const [page, setPage] = useState(1);
  const [inviteTarget, setInviteTarget] = useState<Practitioner | null>(null);

  const list = useMemo(() => {
    if (limit != null) return items.slice(0, limit);
    return items;
  }, [items, limit]);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated =
    limit != null ? list : list.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 p-10 text-center">
        <Users className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
        <p className={cn("mt-2 text-sm font-medium", portalHeading)}>{p.emptyTitle}</p>
        <p className={cn("mt-1 text-xs", portalSubtext)}>{p.emptySubtext}</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950/40">
        <table className="w-full min-w-160 table-fixed text-[13px]">
          <colgroup>
            <col style={{ width: "28%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "34%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/90 dark:border-gray-800 dark:bg-gray-900/60">
              <th scope="col" className={cn(thCls, "text-left")}>{p.candidate}</th>
              <th scope="col" className={cn(thCls, "text-center")}>{p.score}</th>
              <th scope="col" className={cn(thCls, "text-left")}>{p.status}</th>
              <th scope="col" className={cn(thCls, "text-left")}>{p.completedAt}</th>
              <th scope="col" className={cn(thCls, "text-center")}>{p.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/70">
            {paginated.map((item) => {
              const initials = getInitials(item.candidateName || item.candidateEmail);
              return (
                <tr key={item.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-900/40 transition-colors">
                  <td className={cn(tdCls, "overflow-hidden")}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[11px] font-bold",
                          avatarColor(item.candidateName || item.id)
                        )}
                      >
                        {initials || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className={cn("truncate font-medium leading-tight", portalHeading)}>
                          {item.candidateName || "—"}
                        </p>
                        <p className={cn("truncate text-[11px] leading-tight mt-0.5", portalSubtext)}>
                          {item.candidateEmail}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={cn(tdCls, "text-center")}>
                    <ScoreCell score={item.score} />
                  </td>
                  <td className={cn(tdCls, "overflow-hidden")}>
                    <StatusBadge status={item.status} labels={p.statusLabels} />
                  </td>
                  <td className={cn(tdCls, "overflow-hidden whitespace-nowrap", portalSubtext)}>
                    {item.completedAt
                      ? formatRelativeTime(item.completedAt, lang)
                      : item.startedAt
                        ? formatRelativeTime(item.startedAt, lang)
                        : "—"}
                  </td>
                  <td className={tdCls}>
                    <div className="flex flex-nowrap items-center justify-center gap-0.5">
                      <Link href={`/hr/candidates/${item.candidateUserId}`} className={iconBtn} title={p.viewDetailBtn}>
                        <ExternalLink size={14} />
                      </Link>
                      {item.status === "COMPLETED" && item.sessionId ? (
                        <Link
                          href={`/hr/candidates/${item.candidateUserId}/sessions/${item.sessionId}`}
                          className={iconBtn}
                          title={p.viewAnswersBtn}
                        >
                          <FileText size={14} />
                        </Link>
                      ) : (
                        <span className="h-7 w-7" aria-hidden />
                      )}
                      {item.status === "COMPLETED" ? (
                        <button type="button" onClick={() => setInviteTarget(item)} className={iconBtn} title={p.inviteBtn}>
                          <Mail size={14} />
                        </button>
                      ) : (
                        <span className="h-7 w-7" aria-hidden />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {limit == null && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between gap-4 px-1">
          <p className={cn("text-xs tabular-nums", portalSubtext)}>
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, list.length)} / {list.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((x) => Math.max(1, x - 1))}
              disabled={safePage === 1}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPage((x) => Math.min(totalPages, x + 1))}
              disabled={safePage === totalPages}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {inviteTarget && (
        <InviteCandidateModal
          target={{
            candidateName: inviteTarget.candidateName,
            candidateEmail: inviteTarget.candidateEmail,
            questionSetTitle,
            score: inviteTarget.score,
          }}
          onClose={() => setInviteTarget(null)}
          onSend={async (message) => {
            await invitePractitioner(questionSetId, inviteTarget.candidateUserId, message);
          }}
        />
      )}
    </>
  );
}
