"use client";

/**
 * SCRUM-397 v3: cột phải — preview giống Studio/History
 * (template card + skill/focus + sample answer + rubric).
 */
import { useState } from "react";
import { ChevronDown, ChevronUp, Tag } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StudioCodeTemplateId } from "@/features/studio/constants/question-templates";
import type { DifficultyLevel, QuestionType } from "@/features/interview/types/generation-session";
import { QuestionTemplateCard } from "@/features/interview/components/generate/question-template-card";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

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
  const [showSample, setShowSample] = useState(true);
  const [showRubric, setShowRubric] = useState(true);

  return (
    <aside className="xl:sticky xl:top-4 xl:self-start">
      <div className={cn(portalCard, "space-y-3 p-4")}>
        <h3 className={cn(portalHeading, "text-sm font-semibold")}>Xem trước (như Marketplace)</h3>

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
            {questionType}
          </span>
          {skill.trim() ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
              <Tag size={10} />
              {skill.trim()}
            </span>
          ) : null}
          {focusArea.trim() ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              {focusArea.trim()}
            </span>
          ) : null}
        </div>

        <QuestionTemplateCard
          title="Preview"
          difficulty={difficulty}
          prompt={prompt || "Nhập nội dung câu hỏi để xem preview."}
          snippet={contentMode === "code" ? snippet : undefined}
          snippetLanguage={contentMode === "code" ? snippetLanguage : undefined}
          templateId={contentMode === "theory" ? null : templateId}
          diagramDescription={
            contentMode === "system_design"
              ? diagramDescription ||
                "VD: sơ đồ kiến trúc tổng quan + sequence diagram luồng checkout..."
              : undefined
          }
          attachedImageUrl={attachedImageUrl ?? undefined}
        />

        <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setShowSample((v) => !v)}
            className={cn(
              "flex w-full items-center justify-between text-left text-xs font-semibold",
              portalHeading
            )}
          >
            Sample answer
            {showSample ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showSample ? (
            <div className="rounded-lg bg-gray-50 p-2.5 text-xs whitespace-pre-wrap text-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
              {sampleAnswer.trim() || (
                <span className={portalSubtext}>Chưa nhập đáp án mẫu.</span>
              )}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowRubric((v) => !v)}
            className={cn(
              "flex w-full items-center justify-between text-left text-xs font-semibold",
              portalHeading
            )}
          >
            Rubric / tiêu chí
            {showRubric ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showRubric ? (
            rubricLines.length > 0 ? (
              <ul className="list-disc space-y-1 rounded-lg bg-gray-50 py-2 pr-2 pl-5 text-xs text-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
                {rubricLines.map((line, i) => (
                  <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className={cn(portalSubtext, "rounded-lg bg-gray-50 p-2.5 text-xs dark:bg-gray-800/60")}>
                Chưa nhập tiêu chí (mỗi dòng 1 tiêu chí).
              </p>
            )
          ) : null}
        </div>

        {selectedSetTitle ? (
          <p className={cn(portalSubtext, "text-[11px]")}>
            Đích lưu:{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-200">{selectedSetTitle}</span>
          </p>
        ) : (
          <p className={cn(portalSubtext, "text-[11px]")}>
            Chưa chọn bộ đích — tạo hoặc chọn bộ DRAFT ở cột trái.
          </p>
        )}
      </div>
    </aside>
  );
}
