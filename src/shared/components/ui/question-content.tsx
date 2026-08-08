"use client";

import { cn } from "@/lib/cn";
import {
  CodeSnippetBlock,
  type CodeSnippetVariant,
  guessCodeLanguage,
  isSameAsQuestionSnippet,
} from "@/shared/components/ui/code-snippet-block";

interface TextSegment {
  type: "text";
  content: string;
}
interface CodeSegment {
  type: "code";
  lang: string;
  content: string;
}
type Segment = TextSegment | CodeSegment;

/** Chuẩn hóa \\n / \\t literal (LLM / meta cũ) thành ký tự thật. */
function normalizeEscapes(text: string): string {
  if (!text) return text;
  if (!text.includes("\n") && (text.includes("\\n") || text.includes("\\t"))) {
    return text.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  }
  if (text.includes("\\n")) {
    const literalCount = (text.match(/\\n/g) || []).length;
    const realCount = (text.match(/\n/g) || []).length;
    if (literalCount >= realCount) {
      return text.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
    }
  }
  return text;
}

function guessLang(code: string): string {
  return guessCodeLanguage(code);
}

function looksLikeCodeLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return (
    /^(using\s|namespace\s|public\s|private\s|protected\s|internal\s|class\s|interface\s|def\s|async\s+def\s|function\s|const\s|let\s|var\s|export\s|import\s|SELECT\s|WITH\s|INSERT\s|UPDATE\s|DELETE\s|CREATE\s|ALTER\s|DROP\s|await\s|try\s*\{|catch\s*(\(|\{)|finally\s*\{|if\s*\(|for\s*\(|while\s*\(|return\s|#include|package\s|fn\s)/i.test(t)
    || /[{};]\s*$/.test(t)
    || /=>\s*\{/.test(t)
  );
}

function looksLikeCodeBlock(text: string): boolean {
  const t = text.trim();
  if (t.length < 20) return false;
  if (hasLeadingProse(t)) return false;
  const lines = t.split("\n").filter((l) => l.trim());
  if (lines.length < 2 && !/^\s*(SELECT|WITH|INSERT|UPDATE|DELETE|CREATE)\b/i.test(t)) return false;
  const codeLines = lines.filter(looksLikeCodeLine).length;
  return codeLines >= Math.ceil(lines.length * 0.5) || (
    /[{;]\s*$/m.test(t)
    || /^\s*(public |private |protected |class |def |function |const |let |var |SELECT |WITH |INSERT |UPDATE |DELETE |using |import |package )/im.test(t)
    || (t.includes("{") && t.includes("}"))
  );
}

/** Đoạn mở đầu là văn xuôi (VI/EN) — không được nuốt cả khối vào code. */
function hasLeadingProse(text: string): boolean {
  const first = (text.trim().split("\n")[0] || "").trim();
  if (!first) return false;
  if (looksLikeCodeLine(first)) return false;
  if (/^(Giải thích|Explanation|Sử dụng|Nên |Cần |Answer|Đáp án|Lưu ý|Note|Candidate|Ứng viên)/i.test(first)) {
    return true;
  }
  // Có dấu tiếng Việt hoặc câu dài kết thúc bằng dấu câu
  if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(first)) {
    return true;
  }
  if (first.length > 45 && /[.!?。]/.test(first) && !/[{;=]/.test(first)) {
    return true;
  }
  return false;
}

/** Stub câu hỏi (TODO / viết tiếp) — không phải đáp án mẫu. */
function isQuestionStarterSnippet(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return (
    /vi[eế]t\s+(ti[eế]p|query|code|tại\s*đây)/i.test(t)
    || /complete\s+(the|here)|your\s+code\s+here|TODO|NotImplementedException/i.test(t)
    || /--\s*Vi[eế]t\s+ti[eế]p/i.test(t)
    || /\/\/\s*Candidate:|\/\/\s*TODO/i.test(t)
  );
}

/** Nhãn tách giải thích / code (kể cả "code:" viết thường). */
const CODE_LABEL_RE =
  /(?:^|[\n.])\s*(?:Code\s*snippet|Sample\s*code|Đáp\s*án\s*code|Solution\s*code|\bcode)\s*:\s*/i;

/**
 * Tìm vị trí bắt đầu phần code sau văn xuôi (label hoặc dòng code đầu tiên).
 * Trả về index trong chuỗi gốc, hoặc -1.
 */
function findCodeStartIndex(text: string): number {
  const labelMatch = CODE_LABEL_RE.exec(text);
  if (labelMatch && labelMatch.index !== undefined) {
    // Bỏ qua nếu "code:" nằm trong giữa identifier hiếm — chấp nhận
    return labelMatch.index + labelMatch[0].length;
  }

  if (!hasLeadingProse(text)) return -1;

  const lines = text.split("\n");
  let offset = 0;
  let sawProse = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!sawProse) {
      if (trimmed && (hasLeadingProse(trimmed) || (!looksLikeCodeLine(trimmed) && trimmed.length > 15))) {
        sawProse = true;
      }
    } else if (trimmed && looksLikeCodeLine(trimmed)) {
      return offset;
    }
    offset += line.length + 1; // + \n
  }
  return -1;
}

/**
 * Tách sample answer thành giải thích (text) + code block.
 * Ưu tiên: ```fence``` → nhãn code: → dòng code sau prose → khối code thuần.
 */
function parse(text: string): Segment[] {
  const normalized = normalizeEscapes(text);
  const segments: Segment[] = [];
  const fenceRe = /```([a-zA-Z0-9+-]*)\n?([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRe.exec(normalized)) !== null) {
    if (match.index > cursor) {
      pushMixedChunk(segments, normalized.slice(cursor, match.index));
    }
    const body = match[2].replace(/\n$/, "");
    if (body.trim() && !isQuestionStarterSnippet(body)) {
      segments.push({
        type: "code",
        lang: match[1] || guessLang(body),
        content: body,
      });
    }
    cursor = fenceRe.lastIndex;
  }

  if (cursor < normalized.length) {
    pushMixedChunk(segments, normalized.slice(cursor));
  }

  if (segments.length === 0) {
    return [{ type: "text", content: normalized }];
  }
  return segments;
}

function pushMixedChunk(segments: Segment[], raw: string) {
  const chunk = raw;
  if (!chunk.trim()) return;

  // Tách theo nhãn / dòng code sau prose
  const codeStart = findCodeStartIndex(chunk);
  if (codeStart >= 0) {
    // Phần trước label: có thể gồm prose + phần "code:" — cắt sạch đến đầu match
    const labelMatch = CODE_LABEL_RE.exec(chunk);
    let proseEnd = codeStart;
    if (labelMatch && labelMatch.index !== undefined && labelMatch.index < codeStart) {
      proseEnd = labelMatch.index;
      // Nếu match bắt đầu bằng . hoặc \n, giữ dấu câu trong prose
      if (chunk[labelMatch.index] === ".") {
        proseEnd = labelMatch.index + 1;
      }
    }

    const before = chunk.slice(0, proseEnd).trim();
    const after = chunk.slice(codeStart).trim();

    if (before) {
      segments.push({ type: "text", content: before });
    }

    if (after) {
      if (isQuestionStarterSnippet(after)) {
        return;
      }
      const { code, prose } = splitTrailingProse(after);
      if (code.trim()) {
        segments.push({
          type: "code",
          lang: guessLang(code),
          content: code.trim(),
        });
      }
      if (prose.trim()) {
        segments.push({ type: "text", content: prose.trim() });
      }
    }
    return;
  }

  // Không có ranh giới rõ — chỉ coi là code nếu KHÔNG có leading prose
  if (looksLikeCodeBlock(chunk) && !hasLeadingProse(chunk)) {
    segments.push({ type: "code", lang: guessLang(chunk), content: chunk.trim() });
    return;
  }

  segments.push({ type: "text", content: chunk.trim() });
}

function splitTrailingProse(afterLabel: string): { code: string; prose: string } {
  const parts = afterLabel.split(/\n\n+/);
  if (parts.length < 2) {
    return { code: afterLabel.trim(), prose: "" };
  }
  const codeParts: string[] = [];
  const proseParts: string[] = [];
  let inProse = false;
  for (const part of parts) {
    const p = part.trim();
    if (!p) continue;
    if (!inProse && (looksLikeCodeBlock(p) || looksLikeCodeLine(p.split("\n")[0] || ""))) {
      codeParts.push(p);
      continue;
    }
    inProse = true;
    proseParts.push(p);
  }
  if (codeParts.length === 0) {
    return { code: afterLabel.trim(), prose: "" };
  }
  return { code: codeParts.join("\n\n").trim(), prose: proseParts.join("\n\n").trim() };
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
  /**
   * Khi render đáp án mẫu: bỏ code trùng snippet đề bài (data cũ nhét "Code snippet:" vào sample).
   */
  stripMatchingSnippet?: string | null;
  /** Mặc định answer khi dùng cho sample; question nếu parse đề bài có fence. */
  codeVariant?: CodeSnippetVariant;
}

export function QuestionContent({
  text,
  className,
  stripMatchingSnippet,
  codeVariant = "answer",
}: QuestionContentProps) {
  const segments = parse(text).filter((seg) => {
    if (seg.type !== "code") return true;
    return !isSameAsQuestionSnippet(seg.content, stripMatchingSnippet);
  });
  const hasCode = segments.some((s) => s.type === "code");
  const textOnly = segments.filter((s) => s.type === "text");

  if (!hasCode) {
    const fallback =
      textOnly.length > 0
        ? textOnly.map((s) => s.content.trim()).filter(Boolean).join("\n\n")
        : normalizeEscapes(text);
    if (stripMatchingSnippet && textOnly.length > 0) {
      return (
        <div className={cn("space-y-2", className)}>
          {textOnly.map((seg, i) => {
            const trimmed = seg.content.trim();
            if (!trimmed) return null;
            return (
              <p key={i} className="leading-relaxed whitespace-pre-wrap">
                {renderInline(trimmed, String(i))}
              </p>
            );
          })}
        </div>
      );
    }
    return (
      <p className={cn("whitespace-pre-wrap", className)}>
        {renderInline(fallback, "root")}
      </p>
    );
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
          <CodeSnippetBlock
            key={i}
            code={seg.content}
            language={seg.lang}
            variant={codeVariant}
            className="mt-0"
          />
        );
      })}
    </div>
  );
}
