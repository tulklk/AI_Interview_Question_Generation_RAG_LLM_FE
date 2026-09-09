"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import type { AnalyzeJobDescriptionResponse } from "@/features/studio/types/studio.types";
import { formatDetectedLanguageLabel } from "@/features/studio/utils/format-detected-language";

interface Props {
  summary: AnalyzeJobDescriptionResponse;
}

export function DetectedJobProfilePanel({ summary }: Props) {
  const { t } = useLanguage();
  const src = t.studioPage.sources;
  const [expanded, setExpanded] = useState(false);
  const responsibilities = summary.responsibilities ?? [];
  const skills = summary.skills ?? [];
  const previewCount = 3;
  const hasMore = responsibilities.length > previewCount;
  const visible = expanded ? responsibilities : responsibilities.slice(0, previewCount);
  const languageLabel = formatDetectedLanguageLabel(summary.detectedLanguage, {
    vietnamese: src.langVietnamese,
    english: src.langEnglish,
    unknown: src.unknownValue,
  });

  return (
    <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/60 p-2.5 dark:border-gray-800 dark:bg-gray-950/40">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">{src.jobProfileTitle}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div>
          <p className="text-[9px] uppercase tracking-wide text-gray-400">{src.positionLabel}</p>
          <p className={cn("truncate text-[11px] font-semibold", portalHeading)}>
            {summary.position?.trim() || src.unknownValue}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wide text-gray-400">{src.roleLabel}</p>
          <p className={cn("truncate text-[11px] font-semibold", portalHeading)}>
            {summary.detectedRole?.trim() || src.unknownValue}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wide text-gray-400">{src.levelLabel}</p>
          <p className={cn("truncate text-[11px] font-semibold", portalHeading)}>
            {summary.detectedSeniority?.trim() || summary.experienceLevel?.trim() || src.unknownValue}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wide text-gray-400">{src.colLang}</p>
          <p className={cn("truncate text-[11px] font-semibold", portalHeading)}>
            {languageLabel}
          </p>
        </div>
      </div>
      {skills.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] uppercase tracking-wide text-gray-400">{src.colSkills} · {skills.length}</p>
          <div className="flex flex-wrap gap-1">
            {skills.slice(0, 10).map((skill) => (
              <span key={skill} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
      {summary.summary?.trim() && (
        <div className="space-y-1">
          <p className="text-[9px] uppercase tracking-wide text-gray-400">{src.colSummary}</p>
          <p className={cn("text-[11px] leading-snug", portalSubtext)}>{summary.summary}</p>
        </div>
      )}
      {responsibilities.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] uppercase tracking-wide text-gray-400">{src.colResponsibilities}</p>
          <ul className={cn("list-disc space-y-0.5 pl-4 text-[10px] leading-snug", portalSubtext)}>
            {visible.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline"
            >
              {expanded ? src.viewLess : src.viewMore}
              <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
