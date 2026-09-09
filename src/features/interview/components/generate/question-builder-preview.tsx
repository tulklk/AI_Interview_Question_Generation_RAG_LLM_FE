"use client";

/**
 * SCRUM-397: cột phải — preview giống Studio/History
 * (badge Answer method, khung sample/rubric dịu, cảnh báo thiếu dữ liệu).
 */
import { useMemo, useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, Eye, Tag } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StudioCodeTemplateId } from "@/features/studio/constants/question-templates";
import { STUDIO_QUESTION_TEMPLATES } from "@/features/studio/constants/question-templates";
import type { DifficultyLevel, QuestionType } from "@/features/interview/types/generation-session";
import { QuestionTemplateCard } from "@/features/interview/components/generate/question-template-card";
import { formatStudioQuestionTypeLabel } from "@/features/studio/utils/format-question-type-label";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { isPublishReady, type RubricV1 } from "@/shared/rubric";

const DIFFICULTY_CLASS: Record<DifficultyLevel, string> = {
  Easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  Hard: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400",
};

/** Map GeneratedQuestion kebab type → Studio PascalCase để dùng chung formatter. */
const STUDIO_TYPE_KEY_MAP: Record<QuestionType, string> = {
  Technical: "Technical",
  Behavioral: "Behavioral",
  Situational: "Situational",
  "System-design": "SystemDesign",
  "Problem-solving": "ProblemSolving",
};
function toStudioTypeKey(questionType: QuestionType): string {
  return STUDIO_TYPE_KEY_MAP[questionType] ?? questionType;
}

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
  rubricDoc: RubricV1;
  answerMethod: "Text" | "Code";
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
  rubricDoc,
  answerMethod,
  selectedSetTitle,
}: Props) {
  const { t, lang } = useLanguage();
  const qb = t.questionBuilder;
  const rp = t.reviewPage;

  const [showSample, setShowSample] = useState(true);
  const [showRubric, setShowRubric] = useState(true);

  const typeLabel = formatStudioQuestionTypeLabel(
    toStudioTypeKey(questionType),
    lang === "vi" ? "vi" : "en"
  );
  const difficultyLabel = rp.difficulty[difficulty] ?? difficulty;
  const templateLabel = templateId
    ? (STUDIO_QUESTION_TEMPLATES.find((x) => x.id === templateId)?.label ?? templateId)
    : null;

  const missingSample = !sampleAnswer.trim();
  const missingRubric = !isPublishReady(rubricDoc);
  const skillTrimmed = skill.trim();
  const focusTrimmed = focusArea.trim();
  const showFocus =
    !!focusTrimmed && focusTrimmed.toLowerCase() !== skillTrimmed.toLowerCase();

  const readinessHints = useMemo(() => {
    const hints: string[] = [];
    if (missingSample) hints.push(qb.noSampleAnswer);
    if (missingRubric) hints.push(qb.noRubric);
    return hints;
  }, [missingSample, missingRubric, qb.noSampleAnswer, qb.noRubric]);

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

        {/* Badges — giống Studio QuestionDetail */}
        <div className="flex flex-wrap gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", DIFFICULTY_CLASS[difficulty])}>
            {difficultyLabel}
          </span>
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
            {typeLabel || questionType}
          </span>
          {templateLabel ? (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
              {templateLabel}
            </span>
          ) : null}
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              answerMethod === "Code"
                ? "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            )}
          >
            Answer: {answerMethod}
          </span>
          {skillTrimmed ? (
            <span
              title={skillTrimmed}
              className="inline-flex max-w-[160px] items-center gap-1 truncate rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
            >
              <Tag size={9} />
              {skillTrimmed}
            </span>
          ) : null}
          {showFocus ? (
            <span
              title={focusTrimmed}
              className="max-w-[160px] truncate rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            >
              {focusTrimmed}
            </span>
          ) : null}
        </div>

        {readinessHints.length > 0 ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/70 px-2.5 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <ul className="space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
              {readinessHints.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <QuestionTemplateCard
          difficulty={difficulty}
          prompt={prompt || qb.previewQuestionPlaceholder}
          snippet={contentMode === "code" ? snippet : undefined}
          snippetLanguage={contentMode === "code" ? snippetLanguage : undefined}
          templateId={contentMode === "theory" ? null : templateId}
          diagramDescription={
            contentMode === "system_design"
              ? diagramDescription || qb.previewDiagramPlaceholder
              : undefined
          }
          attachedImageUrl={attachedImageUrl ?? undefined}
        />

        {/* Sample answer — khung dịu như History */}
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
            sampleAnswer.trim() ? (
              <div className="rounded-lg border border-gray-100 border-l-2 border-l-emerald-500 bg-emerald-50/40 px-3 py-2.5 dark:border-gray-800 dark:border-l-emerald-500 dark:bg-emerald-950/20">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Đáp án mẫu
                </p>
                <p className={cn("mt-1 text-xs leading-relaxed whitespace-pre-wrap", portalHeading)}>
                  {sampleAnswer.trim()}
                </p>
              </div>
            ) : (
              <p className={cn(portalSubtext, "text-xs")}>{qb.noSampleAnswer}</p>
            )
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
              <div className="rounded-lg border border-gray-100 border-l-2 border-l-amber-500 bg-amber-50/40 px-3 py-2.5 dark:border-gray-800 dark:border-l-amber-500 dark:bg-amber-950/20">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Scoring rubric
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-gray-700 dark:text-gray-200">
                  {rubricLines.map((line, i) => (
                    <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className={cn(portalSubtext, "text-xs")}>{qb.noRubric}</p>
            )
          ) : null}
        </div>

        <div className="border-t border-gray-100 pt-2.5 dark:border-gray-800">
          {selectedSetTitle ? (
            <p className={cn(portalSubtext, "text-[11px]")}>
              {qb.destinationLabel}{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {selectedSetTitle}
              </span>
            </p>
          ) : (
            <p className={cn(portalSubtext, "text-[11px]")}>{qb.noDestination}</p>
          )}
        </div>
      </div>
    </aside>
  );
}
