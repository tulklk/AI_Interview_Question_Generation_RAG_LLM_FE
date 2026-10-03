"use client";

/**
 * Trạng thái "chưa chọn bộ" của Question Builder.
 * Thay vì một ô trống ở giữa, đưa HR vào hành động ngay: tạo bộ mới hoặc chọn bộ gần đây.
 * Preview bị ẩn ở trạng thái này nên cột giữa được dùng hết chiều ngang còn lại.
 */
import Link from "next/link";
import { ArrowRight, Layers, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import type { HistoryQuestionSetItem } from "@/features/hr/types/history-question-set";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

/** Số bộ gần đây hiển thị tối đa — danh sách đầy đủ vẫn ở cột trái. */
const MAX_RECENT = 6;

type Props = {
  drafts: HistoryQuestionSetItem[];
  loading: boolean;
  onCreateNew: () => void;
  onSelectSet: (id: string) => void;
};

export function QuestionBuilderEmptyState({ drafts, loading, onCreateNew, onSelectSet }: Props) {
  const { t } = useLanguage();
  const qb = t.questionBuilder;
  const recent = drafts.slice(0, MAX_RECENT);

  return (
    <section className={cn(portalCard, "flex min-h-[420px] flex-col justify-center p-6 sm:p-10")}>
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Layers size={26} className="text-primary" />
        </span>
        <div>
          <h2 className={cn("text-lg font-bold", portalHeading)}>{qb.emptyStartTitle}</h2>
          <p className={cn("mx-auto mt-1.5 max-w-md text-sm leading-relaxed", portalSubtext)}>
            {qb.emptyStartBody}
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <Plus size={15} />
          {qb.emptyCreateBtn}
        </button>

        {!loading && recent.length > 0 && (
          <div className="mt-4 w-full text-left">
            <p
              className={cn(
                "mb-2 text-[11px] font-semibold uppercase tracking-widest",
                portalSubtext
              )}
            >
              {qb.emptyPickTitle}
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {recent.map((d) => (
                <li key={d.questionSetId}>
                  <button
                    type="button"
                    onClick={() => onSelectSet(d.questionSetId)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 text-left transition-all hover:border-primary/40 hover:bg-primary/5 dark:border-gray-800 dark:hover:border-primary/40"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm font-semibold", portalHeading)}>
                        {d.title}
                      </span>
                      <span className={cn("mt-0.5 block text-[11px]", portalSubtext)}>
                        {qb.questionCount.replace("{{n}}", String(d.questionCount))} · DRAFT
                      </span>
                    </span>
                    <ArrowRight
                      size={14}
                      className="shrink-0 text-gray-300 transition-colors group-hover:text-primary"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className={cn("mt-2 flex items-center gap-1.5 text-xs", portalSubtext)}>
          <Sparkles size={12} className="text-primary" />
          {qb.emptyAiHint}
          <Link href="/hr/generate-question" className="font-semibold text-primary hover:underline">
            {qb.emptyAiLink}
          </Link>
        </p>
      </div>
    </section>
  );
}
