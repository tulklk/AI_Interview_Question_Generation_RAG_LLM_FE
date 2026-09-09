"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type {
  PlanCoverageItem,
  PlanOutlineItem,
  PlanSourceUsed,
  StudioQuestionCitation,
  StudioQuestionDifficulty,
} from "@/features/studio/types/studio.types";
import {
  formatCitationExcerpt,
  formatJdCitationPrimary,
  isJdCitation,
  resolveCitationOrigin,
} from "@/features/studio/utils/citation-display";

export interface PlanQuestionPreviewLabels {
  title: string;
  subtitle: string;
  theory: string;
  code: string;
  skill: string;
  difficulty: string;
  remove: string;
  sourceJd: string;
  sourceSystem: string;
  sourceLlm: string;
  empty: string;
  minSlotsHint: string;
  /** SCRUM-426: "Đoạn #{{n}}" */
  sourceChunk?: string;
  jobDescription?: string;
  /** SCRUM-427: label «Lý do hỏi» từ goal */
  whyAsked: string;
  whyAskedPlaceholder: string;
}

const DIFF_OPTIONS: { value: string; labelKey: StudioQuestionDifficulty }[] = [
  { value: "easy", labelKey: "Easy" },
  { value: "medium", labelKey: "Medium" },
  { value: "hard", labelKey: "Hard" },
];

function normalizeAnswerMethod(raw: string | undefined | null, type: string): "Text" | "Code" {
  const a = (raw ?? "").trim().toLowerCase();
  if (a === "code" || a === "coding") return "Code";
  if (a === "text" || a === "theory") return "Text";
  const t = type.replace(/[_\s-]/g, "").toLowerCase();
  if (t.includes("problem") || t.includes("coding") || t.includes("algorithm")) return "Code";
  return "Text";
}

/** Nguồn dự kiến — ưu tiên citations đã khóa (SCRUM-426). */
export function expectedOriginsForSlot(
  item: PlanOutlineItem,
  coverage: PlanCoverageItem[] | undefined,
  sourceDetails: PlanSourceUsed[] | undefined
): Array<"JD" | "SYSTEM" | "LLM"> {
  if (item.citations?.length) {
    const origins: Array<"JD" | "SYSTEM" | "LLM"> = [];
    for (const c of item.citations) {
      const o = resolveCitationOrigin(c);
      if (o === "HR" && !origins.includes("JD")) origins.push("JD");
      else if (o === "SYSTEM" && !origins.includes("SYSTEM")) origins.push("SYSTEM");
      else if (o === "LLM" && !origins.includes("LLM")) origins.push("LLM");
      else if (isJdCitation(c.sourceFile) && !origins.includes("JD")) origins.push("JD");
    }
    if (origins.length > 0) return origins;
  }
  const origins: Array<"JD" | "SYSTEM" | "LLM"> = ["JD"];
  const skillKey = (item.skill || item.focusArea || "").trim().toLowerCase();
  const covHit = (coverage ?? []).some((c) => {
    const sameSkill =
      !skillKey ||
      c.skill.toLowerCase() === skillKey ||
      c.focusAreas.some((f) => f.toLowerCase() === skillKey);
    if (!sameSkill) return false;
    return (c.sourceFiles ?? []).some(
      (f) => f && !/^job[-_ ]?description$/i.test(f) && f.toLowerCase() !== "jd"
    );
  });
  const planHasSystem = (sourceDetails ?? []).some(
    (s) => (s.scope ?? "").toUpperCase() === "SYSTEM" || (s.scope ?? "").toUpperCase() === "ADMIN"
  );
  if (covHit || planHasSystem) origins.push("SYSTEM");
  else origins.push("LLM");
  return origins;
}

function formatLockedCitationLine(
  cit: StudioQuestionCitation,
  labels: PlanQuestionPreviewLabels
): string {
  const jdLabel = labels.jobDescription ?? "Job Description";
  const chunkTpl = labels.sourceChunk ?? "Đoạn #{{n}}";
  if (isJdCitation(cit.sourceFile) || resolveCitationOrigin(cit) === "HR") {
    const primary = formatJdCitationPrimary(cit, {
      jobDescription: jdLabel,
      sourceChunk: chunkTpl,
    });
    const ex = formatCitationExcerpt(cit.excerpt, 48);
    return ex ? `${primary} · “${ex}”` : primary;
  }
  const name = cit.sourceFile || labels.sourceSystem;
  const ex = formatCitationExcerpt(cit.excerpt, 40);
  return ex ? `${name} · “${ex}”` : name;
}

export function normalizeOutlineItems(items: PlanOutlineItem[] | null | undefined): PlanOutlineItem[] {
  if (!items?.length) return [];
  return items
    .map((it, i) => ({
      order: it.order > 0 ? it.order : i + 1,
      type: it.type || "technical",
      difficulty: (it.difficulty || "medium").toLowerCase(),
      skill: it.skill || "",
      focusArea: it.focusArea || it.skill || "",
      goal: it.goal || "",
      answerMethod: normalizeAnswerMethod(it.answerMethod, it.type || "technical"),
      citations: Array.isArray(it.citations) ? it.citations : undefined,
    }))
    .sort((a, b) => a.order - b.order)
    .map((it, i) => ({ ...it, order: i + 1 }));
}

interface Props {
  items: PlanOutlineItem[];
  allowedSkills: string[];
  coverage?: PlanCoverageItem[];
  sourceDetails?: PlanSourceUsed[];
  locked?: boolean;
  labels: PlanQuestionPreviewLabels;
  difficultyLabels: Record<StudioQuestionDifficulty, string>;
  onChange: (items: PlanOutlineItem[]) => void;
  className?: string;
}

/**
 * Live preview outline — HR chỉnh Lý thuyết/Code, skill, độ khó, lý do hỏi, xóa slot.
 * SCRUM-426: hiện excerpt JD/Admin đã khóa trên slot.
 * SCRUM-427: goal = rationale khóa (editable).
 */
export function PlanQuestionPreviewList({
  items,
  allowedSkills,
  coverage,
  sourceDetails,
  locked = false,
  labels,
  difficultyLabels,
  onChange,
  className,
}: Props) {
  const rows = normalizeOutlineItems(items);
  const skillOptions = Array.from(
    new Set(
      [...allowedSkills, ...rows.map((r) => r.skill), ...rows.map((r) => r.focusArea)].filter(
        (s) => s && s.trim()
      )
    )
  ).sort((a, b) => a.localeCompare(b));

  const updateAt = (index: number, patch: Partial<PlanOutlineItem>) => {
    const next = rows.map((r, i) => {
      if (i !== index) return r;
      const merged = { ...r, ...patch };
      if (
        (patch.skill != null && patch.skill !== r.skill) ||
        (patch.focusArea != null && patch.focusArea !== r.focusArea)
      ) {
        merged.citations = undefined;
      }
      return merged;
    });
    onChange(normalizeOutlineItems(next));
  };

  const removeAt = (index: number) => {
    if (rows.length <= 5) return;
    onChange(normalizeOutlineItems(rows.filter((_, i) => i !== index)));
  };

  if (rows.length === 0) {
    return (
      <p className={cn("text-[11px] text-gray-500 dark:text-gray-400", className)}>{labels.empty}</p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div>
        <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-100">{labels.title}</h4>
        <p className="text-[10px] text-gray-500 dark:text-gray-400">{labels.subtitle}</p>
      </div>
      <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-0.5">
        {rows.map((row, index) => {
          const lockedCits = row.citations ?? [];
          const origins =
            lockedCits.length > 0 ? null : expectedOriginsForSlot(row, coverage, sourceDetails);
          return (
            <li
              key={`outline-${row.order}-${index}`}
              className="rounded-md border border-gray-200/80 bg-white/60 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900/40"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="shrink-0 text-[10px] font-bold text-gray-500">#{row.order}</span>
                <select
                  disabled={locked}
                  value={row.answerMethod}
                  onChange={(e) =>
                    updateAt(index, {
                      answerMethod: e.target.value === "Code" ? "Code" : "Text",
                    })
                  }
                  className="h-7 rounded border border-gray-200 bg-white px-1 text-[10px] dark:border-gray-600 dark:bg-gray-800"
                  aria-label={labels.theory}
                >
                  <option value="Text">{labels.theory}</option>
                  <option value="Code">{labels.code}</option>
                </select>
                <select
                  disabled={locked || skillOptions.length === 0}
                  value={row.skill || row.focusArea}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateAt(index, { skill: v, focusArea: v });
                  }}
                  className="h-7 min-w-0 flex-1 rounded border border-gray-200 bg-white px-1 text-[10px] dark:border-gray-600 dark:bg-gray-800"
                  aria-label={labels.skill}
                >
                  {skillOptions.length === 0 ? (
                    <option value={row.skill}>{row.skill || "—"}</option>
                  ) : (
                    skillOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))
                  )}
                </select>
                <select
                  disabled={locked}
                  value={row.difficulty}
                  onChange={(e) => updateAt(index, { difficulty: e.target.value })}
                  className="h-7 rounded border border-gray-200 bg-white px-1 text-[10px] dark:border-gray-600 dark:bg-gray-800"
                  aria-label={labels.difficulty}
                >
                  {DIFF_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {difficultyLabels[d.labelKey]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={locked || rows.length <= 5}
                  title={rows.length <= 5 ? labels.minSlotsHint : labels.remove}
                  onClick={() => removeAt(index)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
              <div className="mt-1.5 rounded-md border border-violet-200/80 bg-violet-50/80 px-2 py-1.5 dark:border-violet-800/50 dark:bg-violet-950/30">
                <p className="text-[9px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  {labels.whyAsked}
                </p>
                <textarea
                  disabled={locked}
                  value={row.goal}
                  onChange={(e) => updateAt(index, { goal: e.target.value })}
                  placeholder={labels.whyAskedPlaceholder}
                  rows={2}
                  className="mt-0.5 w-full resize-y rounded border-0 bg-transparent p-0 text-[11px] font-medium leading-snug text-violet-950 placeholder:text-violet-400 focus:outline-none focus:ring-0 disabled:opacity-60 dark:text-violet-50 dark:placeholder:text-violet-500"
                  aria-label={labels.whyAsked}
                />
              </div>
              {lockedCits.length > 0 ? (
                <div className="mt-1 space-y-0.5">
                  {lockedCits.map((c, ci) => {
                    const origin = resolveCitationOrigin(c);
                    const tone =
                      origin === "SYSTEM" ? "SYSTEM" : origin === "LLM" ? "LLM" : "JD";
                    return (
                      <p
                        key={`cit-${row.order}-${ci}`}
                        className={cn(
                          "truncate text-[9px] leading-snug",
                          tone === "JD" && "text-sky-800 dark:text-sky-200",
                          tone === "SYSTEM" && "text-violet-800 dark:text-violet-200",
                          tone === "LLM" && "text-amber-800 dark:text-amber-200"
                        )}
                        title={formatLockedCitationLine(c, labels)}
                      >
                        <span className="font-semibold">
                          {tone === "JD"
                            ? labels.sourceJd
                            : tone === "SYSTEM"
                              ? labels.sourceSystem
                              : labels.sourceLlm}
                        </span>
                        {` · ${formatLockedCitationLine(c, labels)}`}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-1 flex flex-wrap gap-1">
                  {(origins ?? []).map((o) => (
                    <span
                      key={o}
                      className={cn(
                        "rounded px-1 py-px text-[9px] font-semibold",
                        o === "JD" && "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-100",
                        o === "SYSTEM" &&
                          "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-100",
                        o === "LLM" &&
                          "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100"
                      )}
                    >
                      {o === "JD"
                        ? labels.sourceJd
                        : o === "SYSTEM"
                          ? labels.sourceSystem
                          : labels.sourceLlm}
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
