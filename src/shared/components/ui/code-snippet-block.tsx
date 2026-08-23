"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";

/** Đoán ngôn ngữ lập trình từ nội dung snippet (không cần field BE). */
export function guessCodeLanguage(code: string): string {
  const s = (code || "").trim();
  if (!s) return "code";
  if (/^\s*(SELECT|WITH|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(s)) return "sql";
  if (
    /^\s*(using\s+|namespace\s+|public\s+(async\s+)?(class|interface|static|void|int|string|Task|List|IEnumerable))/m.test(s)
    || /\b(async\s+Task|IActionResult|DbContext)\b/.test(s)
  ) {
    return "csharp";
  }
  if (/^\s*(def |class |import |from |async def )/m.test(s) || (/\bself\b/.test(s) && /:\s*$/m.test(s))) {
    return "python";
  }
  if (
    /^\s*(function |const |let |var |export |import )/m.test(s)
    || /=>\s*\{/.test(s)
    || /\b(console\.log|React\.|useState)\b/.test(s)
  ) {
    return "javascript";
  }
  if (/^\s*(package |func |type )/m.test(s)) return "go";
  if (/^\s*(fn |let mut |impl |pub )/m.test(s)) return "rust";
  if (/^\s*(<\?php|namespace )/m.test(s)) return "php";
  if (/^\s*(public class |System\.out)/m.test(s)) return "java";
  return "code";
}

/** Chuẩn hóa \\n / \\t literal (rationale flatten / LLM) thành newline thật để hiển thị. */
export function normalizeCodeEscapes(code: string): string {
  if (!code) return code;
  // Không có newline thật nhưng có chuỗi "\n" → unescape
  if (!code.includes("\n") && (code.includes("\\n") || code.includes("\\t"))) {
    return code.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  }
  // Vừa có cả hai: ưu tiên unescape nếu literal nhiều hơn
  if (code.includes("\\n")) {
    const literalCount = (code.match(/\\n/g) || []).length;
    const realCount = (code.match(/\n/g) || []).length;
    if (literalCount >= realCount) {
      return code.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
    }
  }
  return code;
}

/** Chuẩn hóa để so sánh code đề bài vs code trong sample (tránh hiện trùng). */
export function normalizeCodeForCompare(code: string): string {
  return normalizeCodeEscapes(code || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** True nếu block code trong sample chính là (hoặc gần như) snippet đề bài. */
export function isSameAsQuestionSnippet(code: string, questionSnippet?: string | null): boolean {
  if (!questionSnippet?.trim() || !code?.trim()) return false;
  const a = normalizeCodeForCompare(code);
  const b = normalizeCodeForCompare(questionSnippet);
  if (!a || !b) return false;
  if (a === b) return true;
  // Một bên chứa gần hết bên kia (starter vs bản copy có thêm comment)
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length >= 40 && longer.includes(shorter)) return true;
  return false;
}

export type CodeSnippetVariant = "question" | "answer";

/** ~14 lines at text-[11px] leading-relaxed (~1.625) ≈ 14 * 1.625 * 11px ≈ 250px */
const COLLAPSE_LINE_THRESHOLD = 14;
const COLLAPSED_MAX_HEIGHT_PX = 280;

interface CodeSnippetBlockProps {
  code: string;
  /** Ghi đè ngôn ngữ nếu đã biết (vd. từ fence ```sql). */
  language?: string | null;
  /** question = đề bài; answer = đáp án mẫu — badge + màu khác nhau. */
  variant?: CodeSnippetVariant;
  className?: string;
}

/** Code block câu hỏi / sample — badge phân biệt Đề bài vs Đáp án.
 *  Hỗ trợ đầy đủ light theme và dark theme.
 */
export function CodeSnippetBlock({
  code,
  language,
  variant = "question",
  className,
}: CodeSnippetBlockProps) {
  const { t } = useLanguage();
  const displayCode = normalizeCodeEscapes(code);
  const lang = (language || guessCodeLanguage(displayCode) || "code").trim() || "code";
  const isAnswer = variant === "answer";
  const roleLabel = isAnswer ? t.questionBuilder.snippetLabelAnswer : t.questionBuilder.snippetLabelQuestion;
  const lineCount = displayCode.split("\n").length;
  const canCollapse = lineCount > COLLAPSE_LINE_THRESHOLD;
  const [expanded, setExpanded] = useState(false);
  const collapsed = canCollapse && !expanded;

  return (
    <div
      className={cn(
        "mt-3 overflow-hidden rounded-lg border text-sm",
        isAnswer
          ? "border-emerald-200 dark:border-emerald-800/70"
          : "border-sky-200 dark:border-sky-900/80",
        className
      )}
    >
      {/* ── Header bar ── */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b px-3 py-1.5",
          isAnswer
            ? "border-emerald-100 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950"
            : "border-sky-100 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950"
        )}
      >
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            isAnswer
              ? "bg-emerald-600 text-white dark:bg-emerald-700/80 dark:text-emerald-100"
              : "bg-sky-600 text-white dark:bg-sky-800/80 dark:text-sky-100"
          )}
        >
          {roleLabel}
        </span>
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wider",
            isAnswer
              ? "text-emerald-600 dark:text-gray-500"
              : "text-sky-600 dark:text-gray-500"
          )}
        >
          {lang}
        </span>
      </div>

      {/* ── Code area ── */}
      <div className="relative">
        <pre
          className={cn(
            "m-0 overflow-x-auto whitespace-pre px-3 py-3 font-mono text-[11px] leading-relaxed",
            "bg-gray-50 dark:bg-gray-950",
            collapsed && "overflow-hidden"
          )}
          style={collapsed ? { maxHeight: COLLAPSED_MAX_HEIGHT_PX } : undefined}
        >
          <code
            className={cn(
              "block whitespace-pre font-mono text-[11px] leading-relaxed",
              isAnswer
                ? "text-emerald-900 dark:text-emerald-300"
                : "text-sky-900 dark:text-sky-200"
            )}
          >
            {displayCode}
          </code>
        </pre>
        {collapsed && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-gray-50 to-transparent dark:from-gray-950"
            aria-hidden
          />
        )}
      </div>

      {canCollapse && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex w-full items-center justify-center gap-1 border-t px-3 py-1.5 text-[11px] font-medium transition-colors",
            isAnswer
              ? "border-emerald-100 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-950"
              : "border-sky-100 bg-sky-50/80 text-sky-800 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-950"
          )}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              {t.questionBuilder.showLessCode}
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              {t.questionBuilder.showMoreCode}
            </>
          )}
        </button>
      )}
    </div>
  );
}
