"use client";

import { cn } from "@/lib/cn";
import { CodeSnippetBlock } from "@/shared/components/ui/code-snippet-block";

interface Props {
  title: string;
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
  return (
    <article className="rounded-xl border border-sky-200/80 bg-white p-4 dark:border-sky-900 dark:bg-gray-900">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800 dark:bg-sky-950/80 dark:text-sky-200">
            Câu hỏi
          </span>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
        </div>
        <div className="flex items-center gap-2">
          {templateId ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{templateId}</span>
          ) : null}
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              difficulty === "Easy" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
              difficulty === "Medium" && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
              difficulty === "Hard" && "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
            )}
          >
            {difficulty}
          </span>
        </div>
      </div>

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

      <p className="text-sm text-gray-700 dark:text-gray-200">{prompt}</p>

      {snippet ? (
        <CodeSnippetBlock
          code={snippet}
          language={snippetLanguage || undefined}
          variant="question"
        />
      ) : null}
      {diagramDescription ? (
        <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50/60 p-2.5 text-xs text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          <p className="font-semibold">Gợi ý diagram cho HR</p>
          <p className="mt-0.5 text-[10px] opacity-80">Không AI gen — chỉ gợi ý loại sơ đồ cần tìm/đính kèm.</p>
          <p className="mt-1">{diagramDescription}</p>
        </div>
      ) : null}
    </article>
  );
}
