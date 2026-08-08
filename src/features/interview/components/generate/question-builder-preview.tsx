"use client";

/**
 * SCRUM-397 v3: cột phải — preview giống Studio/History
 * (template card + skill/focus + sample answer + rubric).
 */
import { useState } from "react";
import { ChevronDown, ChevronUp, Eye, Tag } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StudioCodeTemplateId } from "@/features/studio/constants/question-templates";
import type { DifficultyLevel, QuestionType } from "@/features/interview/types/generation-session";
import { QuestionTemplateCard } from "@/features/interview/components/generate/question-template-card";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

type Props = {
  difficulty: DifficultyLevel;
  questionType: QuestionType;
  prompt: string;
  contentMode: "theory" | "code" | "system_design";
  templateId: StudioCodeTemplateId | null;
  snippet?: string;
  snippetLanguage?: string | null;
  diagramDescription?: string;
  attachedImageUrl?: string | null;
  skill: string;
  focusArea: string;
  sampleAnswer: string;
  rubricLines: string[];
  selectedSetTitle?: string | null;
};

export function QuestionBuilderPreview({
  difficulty,
  questionType,
  prompt,
  contentMode,
  templateId,
  snippet,
  snippetLanguage,
  diagramDescription,
  attachedImageUrl,
  skill,
  focusArea,
  sampleAnswer,
  rubricLines,
  selectedSetTitle,
}: Props) {
  const { t } = useLanguage();
  const qb = t.questionBuilder;

  const [showSample, setShowSample] = useState(true);
  const [showRubric, setShowRubric] = useState(true);

  return (
    <aside className="xl:sticky xl:top-4 xl:self-start">
      <div className={cn(portalCard, "space-y-3.5 p-4")}>

        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Eye size={13} className="text-primary" />
          </span>
          <h3 className={cn(portalHeading, "text-sm font-semibold")}>{qb.previewTitle}</h3>
          <span className={cn(portalSubtext, "text-[10px]")}>{qb.previewSubtitle}</span>
        </div>

        {/* Metadata tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
            {questionType}
          </span>
          {skill.trim() ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
              <Tag size={9} />
              {skill.trim()}
            </span>
          ) : null}
          {focusArea.trim() ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              {focusArea.trim()}
            </span>
          ) : null}
        </div>

        {/* Template card — no title prop so "Preview" label doesn't clutter the header */}
        <QuestionTemplateCard
          difficulty={difficulty}
          prompt={prompt || qb.previewQuestionPlaceholder}
          snippet={contentMode === "code" ? snippet : undefined}
          snippetLanguage={contentMode === "code" ? snippetLanguage : undefined}
          templateId={contentMode === "theory" ? null : templateId}
          diagramDescription={
            contentMode === "system_design"
              ? diagramDescription ||
                qb.previewDiagramPlaceholder
              : undefined
          }
          attachedImageUrl={attachedImageUrl ?? undefined}
        />

        {/* Sample answer */}
        <div className="space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setShowSample((v) => !v)}
            className={cn(
              "flex w-full items-center justify-between gap-2 text-left text-[11px] font-semibold transition-colors hover:text-primary",
              portalHeading
            )}
          >
            <span>{qb.sampleAnswerToggle}</span>
            {showSample ? (
              <ChevronUp size={13} className="shrink-0 text-gray-400" />
            ) : (
              <ChevronDown size={13} className="shrink-0 text-gray-400" />
            )}
          </button>
          {showSample ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap text-gray-700 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-200">
              {sampleAnswer.trim() || (
                <span className={portalSubtext}>{qb.noSampleAnswer}</span>
              )}
            </div>
          ) : null}
        </div>

        {/* Rubric */}
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setShowRubric((v) => !v)}
            className={cn(
              "flex w-full items-center justify-between gap-2 text-left text-[11px] font-semibold transition-colors hover:text-primary",
              portalHeading
            )}
          >
            <span>{qb.rubricToggle}</span>
            {showRubric ? (
              <ChevronUp size={13} className="shrink-0 text-gray-400" />
            ) : (
              <ChevronDown size={13} className="shrink-0 text-gray-400" />
            )}
          </button>
          {showRubric ? (
            rubricLines.length > 0 ? (
              <ul className="list-disc space-y-1 rounded-lg border border-gray-100 bg-gray-50 py-2.5 pr-2 pl-5 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-200">
                {rubricLines.map((line, i) => (
                  <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
                ))}
              </ul>
            ) : (
              <p
                className={cn(
                  portalSubtext,
                  "rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs dark:border-gray-800 dark:bg-gray-800/60"
                )}
              >
                {qb.noRubric}
              </p>
            )
          ) : null}
        </div>

        {/* Destination set */}
        <div className="border-t border-gray-100 pt-2.5 dark:border-gray-800">
          {selectedSetTitle ? (
            <p className={cn(portalSubtext, "text-[11px]")}>
              {qb.destinationLabel}{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {selectedSetTitle}
              </span>
            </p>
          ) : (
            <p className={cn(portalSubtext, "text-[11px]")}>
              {qb.noDestination}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
