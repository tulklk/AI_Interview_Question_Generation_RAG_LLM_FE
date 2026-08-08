"use client";

import { cn } from "@/lib/cn";
import { CodeSnippetBlock } from "@/shared/components/ui/code-snippet-block";
import { useLanguage } from "@/shared/providers/language-context";

// Human-readable short labels for template IDs shown in the card badge
const TEMPLATE_LABELS: Record<string, string> = {
  CODE_COMPLETION:     "Code completion",
  BUG_DETECTION:       "Bug detection",
  REFACTORING:         "Refactoring",
  TEST_CASE_DESIGN:    "Test case",
  PERFORMANCE_ANALYSIS:"Performance",
  SYSTEM_DESIGN:       "System design",
};

interface Props {
  /** Hiển thị trong header bên cạnh badge "CÂU HỎI". Bỏ trống để ẩn. */
  title?: string;
  difficulty: "Easy" | "Medium" | "Hard";
  prompt: string;
  snippet?: string;
  /** Ngôn ngữ snippet (csharp, typescript, …) — hiện badge trên CodeSnippetBlock. */
  snippetLanguage?: string | null;
  templateId?: string | null;
  /** Gợi ý loại diagram HR nên tìm (không phải AI gen ảnh). */
  diagramDescription?: string;
  /** @deprecated Không còn hiển thị trên UI — giữ prop để tương thích. */
  imageHint?: string;
  /** SAS / public URL ảnh HR đã đính kèm — hiển thị trên nội dung câu hỏi. */
  attachedImageUrl?: string;
}

export function QuestionTemplateCard({
  title,
  difficulty,
  prompt,
  snippet,
  snippetLanguage,
  templateId,
  diagramDescription,
  attachedImageUrl,
}: Props) {
  const { t } = useLanguage();
  const templateLabel = templateId ? (TEMPLATE_LABELS[templateId] ?? templateId) : null;

  return (
    <article className="overflow-hidden rounded-xl border border-sky-200/80 bg-white dark:border-sky-900/60 dark:bg-gray-900">
      {/* ── Header strip ── */}
      <div className="flex items-center justify-between gap-2 border-b border-sky-100 bg-sky-50/60 px-3 py-2 dark:border-sky-900/40 dark:bg-sky-950/30">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-sky-600 text-white dark:bg-sky-800/80 dark:text-sky-100">
            {t.questionBuilder.questionBadge}
          </span>
          {title ? (
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{title}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {templateLabel ? (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-primary/10 text-primary">
              {templateLabel}
            </span>
          ) : null}
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[9px] font-bold",
              difficulty === "Easy" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
              difficulty === "Medium" && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
              difficulty === "Hard" && "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
            )}
          >
            {difficulty}
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-3.5">
        {attachedImageUrl ? (
          <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            {/* eslint-disable-next-line @next/next/no-img-element -- SAS Azure Blob URL động */}
            <img
              src={attachedImageUrl}
              alt="Ảnh đính kèm câu hỏi"
              className="max-h-72 w-full object-contain bg-gray-50 dark:bg-gray-950"
            />
          </div>
        ) : null}

        <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">{prompt}</p>

        {snippet ? (
          <CodeSnippetBlock
            code={snippet}
            language={snippetLanguage || undefined}
            variant="question"
          />
        ) : null}

        {diagramDescription ? (
          <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50/60 p-2.5 dark:border-sky-900/50 dark:bg-sky-950/30">
            <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-400">
              {t.questionBuilder.diagramHintTitle}
            </p>
            <p className="mt-0.5 text-[10px] text-sky-500 dark:text-sky-500">
              {t.questionBuilder.diagramHintNote}
            </p>
            <p className="mt-1.5 text-xs text-sky-800 dark:text-sky-200">{diagramDescription}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}
