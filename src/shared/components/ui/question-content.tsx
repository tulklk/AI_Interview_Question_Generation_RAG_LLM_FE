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

interface QuestionContentProps {
  text: string;
  className?: string;
}

export function QuestionContent({ text, className }: QuestionContentProps) {
  const segments = parse(text);
  const hasCode = segments.some((s) => s.type === "code");

  if (!hasCode) {
    return <p className={className}>{text}</p>;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          const trimmed = seg.content.trim();
          if (!trimmed) return null;
          return (
            <p key={i} className="leading-relaxed whitespace-pre-wrap">
              {trimmed}
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
