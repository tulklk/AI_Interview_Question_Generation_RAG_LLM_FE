"use client";

import { useMemo, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

/** Section titles (VI + EN). Matched case-insensitive; optional trailing ":". */
export const SECTION_HEADINGS = [
  "Mô tả",
  "Trách nhiệm",
  "Yêu cầu",
  "Kỹ năng",
  "Kinh nghiệm",
  "Trình độ",
  "Quyền lợi",
  "Công nghệ",
  "Ưu tiên",
  "Lợi thế",
  "Responsibilities",
  "Requirements",
  "Qualifications",
  "Skills",
  "Experience",
  "Benefits",
  "Nice to have",
] as const;

/** Longest-first so multi-word phrases win over shorter tokens. */
export const TECH_KEYWORDS = [
  "GitHub Actions",
  "Azure DevOps",
  "GitLab CI",
  "CloudFormation",
  "canary deployment",
  "blue-green",
  "Cloud Watch",
  "CloudWatch",
  "Infrastructure as Code",
  "ASP.NET Core",
  "ASP.NET",
  ".NET Core",
  "Node.js",
  "React.js",
  "Next.js",
  "CI/CD",
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Terraform",
  "Bicep",
  "Prometheus",
  "Grafana",
  "ELK",
  "Linux",
  "Python",
  "PowerShell",
  "Bash",
  "DevOps",
  "Cloud",
  "SRE",
  "Selenium",
  "Playwright",
  "Cypress",
  "C#",
  ".NET",
  "TypeScript",
  "JavaScript",
  "SQL Server",
  "PostgreSQL",
  "MySQL",
  "Redis",
  "Kafka",
  "RabbitMQ",
  "Swagger",
  "Git",
].slice().sort((a, b) => b.length - a.length);

const ROLE_PHRASES = [
  "DevOps / Cloud Engineer",
  "Cloud Engineer",
  "Software Technical Lead",
  "Automation Tester",
  "Software Developer",
].slice().sort((a, b) => b.length - a.length);

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isSectionHeading(line: string): boolean {
  const normalized = line.trim().replace(/:+\s*$/, "");
  if (!normalized) return false;
  const lower = normalized.toLowerCase();
  return SECTION_HEADINGS.some((h) => h.toLowerCase() === lower);
}

function isBulletLine(line: string): boolean {
  return /^\s*[-*•–—]\s+/.test(line);
}

function stripBullet(line: string): string {
  return line.replace(/^\s*[-*•–—]\s+/, "").trim();
}

/** Split plain JD into structural blocks (headings / lists / paragraphs). */
export function parseJobDescriptionBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paraBuf: string[] = [];
  let listBuf: string[] = [];

  function flushPara() {
    if (paraBuf.length === 0) return;
    const joined = paraBuf.join(" ").replace(/\s+/g, " ").trim();
    if (joined) blocks.push({ type: "paragraph", text: joined });
    paraBuf = [];
  }

  function flushList() {
    if (listBuf.length === 0) return;
    blocks.push({ type: "list", items: listBuf });
    listBuf = [];
  }

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushPara();
      continue;
    }

    if (isSectionHeading(trimmed)) {
      flushList();
      flushPara();
      blocks.push({ type: "heading", text: trimmed.replace(/:+\s*$/, "") + ":" });
      continue;
    }

    if (isBulletLine(line)) {
      flushPara();
      listBuf.push(stripBullet(line));
      continue;
    }

    flushList();
    paraBuf.push(trimmed);
  }

  flushList();
  flushPara();
  return blocks;
}

type MatchRange = { start: number; end: number };

function findNonOverlappingMatches(text: string, patterns: RegExp[]): MatchRange[] {
  const candidates: MatchRange[] = [];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex += 1;
        continue;
      }
      candidates.push({ start: m.index, end: m.index + m[0].length });
    }
  }
  candidates.sort((a, b) => a.start - b.start || b.end - a.end - (a.end - a.start));
  const taken: MatchRange[] = [];
  for (const c of candidates) {
    if (taken.some((t) => !(c.end <= t.start || c.start >= t.end))) continue;
    taken.push(c);
  }
  taken.sort((a, b) => a.start - b.start);
  return taken;
}

function buildHighlightPatterns(): RegExp[] {
  const patterns: RegExp[] = [
    // VI experience ranges
    /\d+\s*[–\-]\s*\d+\+?\s*năm\s*kinh\s*nghiệm/gi,
    /\d+\+\s*năm\s*kinh\s*nghiệm/gi,
    /\d+\s*năm\s*kinh\s*nghiệm/gi,
    // EN experience
    /\d+\s*[–\-]\s*\d+\+?\s*years?(?:\s+of)?\s+experience/gi,
    /\d+\+\s*years?(?:\s+of)?\s+experience/gi,
    /at\s+least\s+\d+\s*years?(?:\s+of)?\s+experience/gi,
    // Seniority (whole words)
    /\b(?:Senior|Junior|Fresher|Mid-level|Lead)\b/gi,
  ];

  for (const phrase of ROLE_PHRASES) {
    patterns.push(new RegExp(escapeRegExp(phrase), "gi"));
  }

  for (const kw of TECH_KEYWORDS) {
    const esc = escapeRegExp(kw);
    // Word-ish boundaries: avoid matching inside longer identifiers
    if (/^[A-Za-z0-9.+#]+$/.test(kw) && !kw.includes(" ")) {
      patterns.push(new RegExp(`(?<![A-Za-z0-9.+#])${esc}(?![A-Za-z0-9.+#])`, "gi"));
    } else {
      patterns.push(new RegExp(esc, "gi"));
    }
  }

  return patterns;
}

const HIGHLIGHT_PATTERNS = buildHighlightPatterns();

/** Highlight experience / tech / role phrases; preserve original casing. */
export function highlightInline(text: string): ReactNode[] {
  if (!text) return [];
  const ranges = findNonOverlappingMatches(text, HIGHLIGHT_PATTERNS);
  if (ranges.length === 0) return [text];

  const nodes: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((r, i) => {
    if (r.start > cursor) nodes.push(text.slice(cursor, r.start));
    nodes.push(
      <strong key={`hl-${i}-${r.start}`} className={cn("font-semibold", portalHeadingAlt)}>
        {text.slice(r.start, r.end)}
      </strong>
    );
    cursor = r.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

type JobDescriptionContentProps = {
  text: string;
  className?: string;
};

/** Safe plain-text JD renderer (headings, lists, inline emphasis). */
export function JobDescriptionContent({ text, className }: JobDescriptionContentProps) {
  const blocks = useMemo(() => parseJobDescriptionBlocks(text), [text]);

  if (!text.trim()) return null;

  return (
    <div className={cn("min-w-0 wrap-break-word", className)}>
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h3
              key={`h-${i}`}
              className={cn(
                "mb-2 mt-5 text-[13px] font-semibold first:mt-0",
                portalHeadingAlt
              )}
            >
              {block.text}
            </h3>
          );
        }
        if (block.type === "list") {
          return (
            <ul
              key={`l-${i}`}
              className={cn("mb-4 list-disc space-y-1.5 pl-5 text-sm leading-7", portalSubtextAlt)}
            >
              {block.items.map((item, j) => (
                <li key={`li-${i}-${j}`} className="pl-0.5">
                  {highlightInline(item)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p
            key={`p-${i}`}
            className={cn("mb-4 text-sm leading-7 last:mb-0", portalSubtextAlt)}
          >
            {highlightInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
