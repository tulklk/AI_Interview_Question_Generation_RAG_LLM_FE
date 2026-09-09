"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import type { PlanProvenanceBlock, PlanSourceScope } from "@/features/studio/types/studio.types";
import { formatLlmProvenanceReason } from "@/features/studio/utils/citation-display";
import { useLanguage } from "@/shared/providers/language-context";

export type SourceOriginKind = PlanSourceScope | "HR" | "SYSTEM" | "ADMIN" | "LLM";

export interface SourceOriginLabels {
  hr: string;
  admin: string;
  jd: string;
  llm: string;
}

/** Shared {hr, admin, jd, llm} label map — was independently memoized in both
 * sources-panel.tsx and chat-panel.tsx; centralized so a new origin kind only
 * needs updating here. */
export function useSourceOriginLabels(): SourceOriginLabels {
  const { t } = useLanguage();
  const src = t.studioPage.sources;
  return useMemo(
    () => ({
      hr: src.sourceOriginHr,
      admin: src.sourceOriginAdmin,
      jd: src.sourceOriginJd,
      llm: src.sourceOriginLlm,
    }),
    [src.sourceOriginHr, src.sourceOriginAdmin, src.sourceOriginJd, src.sourceOriginLlm]
  );
}

/** Chuẩn hóa scope/knowledgeBase → HR | SYSTEM | JD | null */
export function normalizeSourceOrigin(
  scopeOrKb: string | null | undefined,
  sourceFile?: string | null
): SourceOriginKind | null {
  const file = (sourceFile ?? "").trim().toLowerCase();
  if (file === "job-description" || file === "jd" || file === "job description" || file === "job_description") {
    return "JD";
  }

  const raw = (scopeOrKb ?? "").trim().toUpperCase();
  if (raw === "HR") return "HR";
  if (raw === "SYSTEM" || raw === "ADMIN") return "SYSTEM";
  if (raw === "JD") return "JD";
  if (raw === "LLM") return "LLM";

  const kb = (scopeOrKb ?? "").trim().toLowerCase();
  if (kb === "hr") return "HR";
  if (kb === "system") return "SYSTEM";
  return null;
}

export function planSourceDisplayName(name: string, jdLabel: string): string {
  if (name === "job-description") return jdLabel;
  return name;
}

export function resolvePlanSourceRows(
  sourcesUsed: string[] | undefined,
  sourceDetails: { name: string; scope?: string | null }[] | undefined
): { name: string; scope?: string | null }[] {
  if (sourceDetails?.length) return sourceDetails;
  return (sourcesUsed ?? []).map((name) => ({ name, scope: null }));
}

export function sourceOriginLabel(kind: SourceOriginKind, labels: SourceOriginLabels): string {
  if (kind === "JD") return labels.jd;
  if (kind === "HR") return labels.hr;
  if (kind === "LLM") return labels.llm;
  return labels.admin;
}

export function provenanceTooltip(block?: PlanProvenanceBlock | null): string | undefined {
  if (!block?.items?.length) return undefined;
  return block.items
    .slice(0, 3)
    .map((it) => {
      const parts: string[] = [it.origin];
      if (it.sourceFile) parts.push(it.sourceFile);
      if (it.reason) {
        const reason =
          it.origin === "LLM"
            ? formatLlmProvenanceReason(it.reason, 120)
            : it.reason;
        if (reason) parts.push(reason);
      }
      return parts.join(" · ");
    })
    .join("\n");
}

export function SourceOriginBadge({
  scopeOrKb,
  sourceFile,
  labels,
  className,
}: {
  scopeOrKb?: string | null;
  sourceFile?: string | null;
  labels: SourceOriginLabels;
  className?: string;
}) {
  const kind = normalizeSourceOrigin(scopeOrKb, sourceFile);
  if (!kind || kind === "JD") return null;

  const isHr = kind === "HR";
  const isLlm = kind === "LLM";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
        isHr
          ? "bg-primary/10 text-primary dark:bg-primary/20"
          : isLlm
            ? "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
            : "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200",
        className
      )}
      title={isHr ? labels.hr : isLlm ? labels.llm : labels.admin}
    >
      {sourceOriginLabel(kind, labels)}
    </span>
  );
}

/** SCRUM-420: Badge provenance trên focus/coverage — dùng primaryOrigin từ BE. */
export function ProvenanceOriginBadge({
  primaryOrigin,
  provenance,
  labels,
  className,
}: {
  primaryOrigin?: string | null;
  provenance?: PlanProvenanceBlock | null;
  labels: SourceOriginLabels;
  className?: string;
}) {
  const origin = (primaryOrigin ?? provenance?.primaryOrigin) as PlanSourceScope | undefined;
  if (!origin || origin === "JD") return null;
  const tip = provenanceTooltip(provenance);
  return (
    <span title={tip}>
      <SourceOriginBadge
        scopeOrKb={origin}
        labels={labels}
        className={className}
      />
    </span>
  );
}
