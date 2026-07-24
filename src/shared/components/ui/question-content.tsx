"use client";

import { cn } from "@/lib/cn";

interface TextSegment { type: "text"; content: string }
interface CodeSegment { type: "code"; lang: string; content: string }
type Segment = TextSegment | CodeSegment;

function parse(text: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /```([a-zA-Z0-9]*)\n?([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > cursor) {
      segments.push({ type: "text", content: text.slice(cursor, match.index) });
    }
    segments.push({ type: "code", lang: match[1] || "code", content: match[2].replace(/\n$/, "") });
    cursor = regex.lastIndex;
  }

  if (cursor < text.length) {
    segments.push({ type: "text", content: text.slice(cursor) });
  }

  return segments;
}

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(`[^`\n]+`)/g).filter((p) => p !== "");
  if (parts.length === 1 && !parts[0].startsWith("`")) return text;
  return parts.map((part, i) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 1 ? (
      <code
        key={`${keyPrefix}-${i}`}
        className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[0.9em] font-mono text-primary whitespace-pre-wrap"
      >
        {part.slice(1, -1)}
      </code>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    )
  );
}

interface QuestionContentProps {
  text: string;
  className?: string;
}

export function QuestionContent({ text, className }: QuestionContentProps) {
  const segments = parse(text);
  const hasCode = segments.some((s) => s.type === "code");

  if (!hasCode) {
    return <p className={cn("whitespace-pre-wrap", className)}>{renderInline(text, "root")}</p>;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          const trimmed = seg.content.trim();
          if (!trimmed) return null;
          return (
            <p key={i} className="leading-relaxed whitespace-pre-wrap">
              {renderInline(trimmed, String(i))}
            </p>
          );
        }

        return (
          <div key={i} className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 text-sm">
            {/* Language badge header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {seg.lang}
              </span>
            </div>
            {/* Code body */}
            <pre className="overflow-x-auto bg-gray-50 dark:bg-gray-900 px-4 py-4 m-0">
              <code className="font-mono text-[13px] leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre">
                {seg.content}
              </code>
            </pre>
          </div>
        );
      })}
    </div>
  );
}
