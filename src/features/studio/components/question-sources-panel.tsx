"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StudioQuestion, StudioQuestionCitation } from "@/features/studio/types/studio.types";
import {
  type CitationRoleLabels,
  citationDisplayName,
  citationsForDisplay,
  formatCitationExcerpt,
  formatJdCitationPrimary,
  formatLlmProvenanceReason,
  groupQuestionSources,
} from "@/features/studio/utils/citation-display";

export interface QuestionSourcesLabels extends CitationRoleLabels {
  jobDescription: string;
  sourcesPanelTitle: string;
  sourcesEmptyLegacy: string;
  missingAdminWarning: string;
  /** SCRUM-425: "Đoạn #{{n}}" / "Chunk #{{n}}" */
  sourceChunk: string;
}

const BADGE: Record<"hr" | "admin" | "llm", string> = {
  hr: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-100",
  admin: "bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-100",
  llm: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100",
};

function originBadge(origin: "hr" | "admin" | "llm", labels: CitationRoleLabels): string {
  if (origin === "hr") return labels.sourceRoleJd;
  if (origin === "admin") return labels.sourceRoleAdmin;
  return labels.sourceRoleLlm;
}

function SourceLine({
  tone,
  badge,
  primary,
  secondary,
}: {
  tone: "hr" | "admin" | "llm";
  badge: string;
  primary: string;
  secondary?: string | null;
}) {
  return (
    <p className="flex min-w-0 items-baseline gap-1.5 text-[11px] leading-snug text-gray-700 dark:text-gray-200">
      <span
        className={cn(
          "shrink-0 rounded px-1 py-px text-[9px] font-bold tracking-wide",
          // Tag LLM = "Suy luận" — không uppercase để đọc tự nhiên
          tone === "llm" ? "normal-case" : "uppercase",
          BADGE[tone]
        )}
      >
        {badge}
      </span>
      <span className="min-w-0 truncate">
        <span className="font-medium">{primary}</span>
        {secondary ? (
          <span className="text-gray-500 dark:text-gray-400">{` · ${secondary}`}</span>
        ) : null}
      </span>
    </p>
  );
}

function buildRoleLabels(labels: QuestionSourcesLabels): CitationRoleLabels {
  return {
    sourceRoleJd: labels.sourceRoleJd,
    sourceRoleAdmin: labels.sourceRoleAdmin,
    sourceRoleLlm: labels.sourceRoleLlm,
    sourceWhyAsked: labels.sourceWhyAsked,
    sourceTechnicalBody: labels.sourceTechnicalBody,
    sourcePrimary: labels.sourcePrimary,
    sourceSecondary: labels.sourceSecondary,
  };
}

function renderCitationLine(
  cit: StudioQuestionCitation,
  tone: "hr" | "admin" | "llm",
  labels: QuestionSourcesLabels,
  roleLabels: CitationRoleLabels,
  key: string
) {
  const name =
    tone === "hr"
      ? formatJdCitationPrimary(cit, {
          jobDescription: labels.jobDescription,
          sourceChunk: labels.sourceChunk,
        })
      : citationDisplayName(cit.sourceFile, { jobDescription: labels.jobDescription });
  const excerpt = formatCitationExcerpt(cit.excerpt, 56);
  // LLM: chỉ hiện nguồn suy luận (không hiện chú thích retrieve kỹ thuật)
  const secondary =
    tone === "llm" && cit.reason
      ? formatLlmProvenanceReason(cit.reason, 48) ?? excerpt
      : excerpt;
  return (
    <SourceLine
      key={key}
      tone={tone}
      badge={originBadge(tone, roleLabels)}
      primary={tone === "llm" && !name ? labels.sourceRoleLlm : name}
      secondary={secondary}
    />
  );
}

/** Panel mở — badge + file + excerpt ngắn từ API. */
export function QuestionSourcesGroupedPanel({
  question,
  labels,
  className,
}: {
  question: StudioQuestion;
  labels: QuestionSourcesLabels;
  className?: string;
}) {
  const { jd, admin, llm } = groupQuestionSources(question);
  const roleLabels = buildRoleLabels(labels);
  const llmExtra =
    question.sourceProvenance?.items.filter((it) => it.origin === "LLM") ?? [];
  const hasLines =
    jd.length > 0 ||
    admin.length > 0 ||
    llm.length > 0 ||
    llmExtra.length > 0 ||
    question.missingAdminWarning;

  if (!hasLines) {
    return (
      <p className={cn("text-[11px] text-gray-400 dark:text-gray-500", className)}>
        {labels.sourcesEmptyLegacy}
      </p>
    );
  }

  return (
    <div className={cn("space-y-1 rounded-md border border-gray-200/70 px-2 py-1.5 dark:border-gray-700", className)}>
      {question.missingAdminWarning ? (
        <p className="flex items-center gap-1 text-[10px] text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-3 w-3 shrink-0" strokeWidth={2} />
          <span className="truncate">{labels.missingAdminWarning}</span>
        </p>
      ) : null}
      {jd.map((cit, i) => renderCitationLine(cit, "hr", labels, roleLabels, `hr-${i}`))}
      {admin.map((cit, i) => renderCitationLine(cit, "admin", labels, roleLabels, `admin-${i}`))}
      {llm.map((cit, i) => renderCitationLine(cit, "llm", labels, roleLabels, `llm-${i}`))}
      {llmExtra.map((it, i) => (
        <SourceLine
          key={`lp-${i}`}
          tone="llm"
          badge={labels.sourceRoleLlm}
          primary={it.reason ? formatLlmProvenanceReason(it.reason, 72) ?? labels.sourceRoleLlm : labels.sourceRoleLlm}
        />
      ))}
    </div>
  );
}

/** Tóm tắt khi đóng: JD · Admin · Suy luận */
export function QuestionSourcesSummaryChips({
  question,
  labels,
  className,
}: {
  question: StudioQuestion;
  labels: Pick<
    QuestionSourcesLabels,
    "sourceRoleJd" | "sourceRoleAdmin" | "sourceRoleLlm" | "missingAdminWarning"
  >;
  className?: string;
}) {
  const { jd, admin, llm } = groupQuestionSources(question);
  const hasLlm =
    llm.length > 0 || question.sourceProvenance?.items.some((i) => i.origin === "LLM");

  if (question.missingAdminWarning) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-[10px] text-amber-700 dark:text-amber-300",
          className
        )}
        title={labels.missingAdminWarning}
      >
        <AlertTriangle className="h-3 w-3" strokeWidth={2} />
        {labels.missingAdminWarning}
      </span>
    );
  }

  const parts: string[] = [];
  if (jd.length > 0) parts.push(labels.sourceRoleJd);
  if (admin.length > 0) parts.push(labels.sourceRoleAdmin);
  if (hasLlm) parts.push(labels.sourceRoleLlm);
  if (parts.length === 0) return null;

  return (
    <span className={cn("text-[10px] text-gray-500 dark:text-gray-400", className)}>
      {parts.join(" · ")}
    </span>
  );
}

export function QuestionSourcesCompactGrouped({
  question,
  labels,
  className,
}: {
  question: StudioQuestion;
  labels: QuestionSourcesLabels;
  className?: string;
}) {
  const rows = citationsForDisplay(question.citations);
  if (rows.length === 0 && !question.missingAdminWarning) {
    return (
      <p className={cn("text-[11px] text-gray-400", className)}>{labels.sourcesEmptyLegacy}</p>
    );
  }

  return (
    <QuestionSourcesGroupedPanel question={question} labels={labels} className={className} />
  );
}
