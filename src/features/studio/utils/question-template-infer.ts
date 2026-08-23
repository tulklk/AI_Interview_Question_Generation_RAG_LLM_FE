import type { StudioCodeTemplateId } from "@/features/studio/constants/question-templates";
import type { StudioQuestion } from "@/features/studio/types/studio.types";
import {
  hasSnippetLanguageMismatch,
  isCodeHeavyTemplate,
  isConceptualTheoryQuestion,
} from "@/features/studio/utils/question-content-match";

export interface StudioTemplateViewModel {
  templateId: StudioCodeTemplateId | null;
  snippet?: string;
  /** Ngôn ngữ snippet (csharp, typescript, …) — từ meta `lang=` hoặc đoán. */
  snippetLanguage?: string;
  /** Gợi ý loại diagram HR nên tìm (không AI gen). */
  diagramDescription?: string;
  /** Gợi ý hình ảnh từ AI hoặc meta — mọi template. */
  imageHint?: string;
  attachedImageUrl?: string;
}

/** Danh sách ngôn ngữ chọn tay trên Question Builder. */
export const SNIPPET_LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "auto", label: "Tự đoán" },
  { value: "csharp", label: "C#" },
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "sql", label: "SQL" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "cpp", label: "C++" },
  { value: "kotlin", label: "Kotlin" },
];

const TEMPLATE_IDS: StudioCodeTemplateId[] = [
  "CODE_COMPLETION",
  "BUG_DETECTION",
  "REFACTORING",
  "TEST_CASE_DESIGN",
  "PERFORMANCE_ANALYSIS",
  "SYSTEM_DESIGN",
];

const DEFAULT_DIAGRAM_HINT =
  "Tìm sơ đồ kiến trúc tổng quan (components, API gateway, DB) và sequence/data-flow minh họa luồng chính của bài toán.";

const DEFAULT_IMAGE_HINT_BY_TEMPLATE: Record<StudioCodeTemplateId, string> = {
  CODE_COMPLETION: "Tìm ảnh screenshot đoạn code TODO/incomplete hoặc whiteboard thuật toán liên quan bài toán.",
  BUG_DETECTION: "Tìm ảnh đoạn code có lỗi (screenshot IDE) hoặc diagram minh họa bug flow.",
  REFACTORING: "Tìm ảnh code smell trước/sau hoặc slide clean-code liên quan.",
  TEST_CASE_DESIGN: "Tìm ảnh bảng test case / coverage matrix hoặc screenshot unit test.",
  PERFORMANCE_ANALYSIS: "Tìm ảnh Big-O chart, profiler screenshot hoặc diagram bottleneck.",
  SYSTEM_DESIGN: "Tìm sơ đồ kiến trúc / sequence / data-flow từ tài liệu nội bộ (Notion, Confluence, slide).",
};

function normalizeTemplateId(value?: string | null): StudioCodeTemplateId | null {
  if (!value) return null;
  const cleaned = value.trim().toUpperCase().replace(/\s+/g, "_");
  return TEMPLATE_IDS.includes(cleaned as StudioCodeTemplateId) ? (cleaned as StudioCodeTemplateId) : null;
}

function extractFromText(text?: string | null): StudioCodeTemplateId | null {
  const raw = (text || "").toUpperCase();
  if (!raw) return null;
  if (raw.includes("SYSTEM DESIGN") || raw.includes("THIẾT KẾ HỆ THỐNG")) return "SYSTEM_DESIGN";
  if (raw.includes("CODE COMPLETION") || raw.includes("HOÀN THÀNH") || raw.includes("TODO")) return "CODE_COMPLETION";
  if (raw.includes("BUG") || raw.includes("LỖI LOGIC") || raw.includes("FIND THE BUG")) return "BUG_DETECTION";
  if (raw.includes("REFACTOR")) return "REFACTORING";
  if (raw.includes("TEST CASE") || raw.includes("KIỂM THỬ") || raw.includes("UNIT TEST")) return "TEST_CASE_DESIGN";
  if (raw.includes("PERFORMANCE") || raw.includes("BOTTLENECK") || raw.includes("COMPLEXITY") || raw.includes("O(")) {
    return "PERFORMANCE_ANALYSIS";
  }
  return null;
}

function pickMeta(text: string | null | undefined, key: string): string | undefined {
  if (!text) return undefined;
  const re = new RegExp(`${key}=([^;]+)`, "i");
  const m = text.match(re);
  const v = m?.[1]?.trim();
  return v || undefined;
}

/** Chuẩn hóa \\n / \\t literal từ LLM hoặc meta cũ thành newline thật. */
function normalizeSnippetEscapes(snippet: string): string {
  if (!snippet) return snippet;
  if (!snippet.includes("\n") && (snippet.includes("\\n") || snippet.includes("\\t"))) {
    return snippet.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  }
  if (snippet.includes("\\n")) {
    const literalCount = (snippet.match(/\\n/g) || []).length;
    const realCount = (snippet.match(/\n/g) || []).length;
    if (literalCount >= realCount) {
      return snippet.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
    }
  }
  return snippet;
}

/**
 * Snippet ĐỀ BÀI only: `codeSnippet` or fenced ``` in content.
 * Never use `expectedAnswer` (sample SQL/code ending in `;` caused false mismatch warnings).
 */
function resolveProblemSnippet(question: StudioQuestion): string | undefined {
  const direct = (question.codeSnippet || "").trim();
  if (direct) return normalizeSnippetEscapes(direct);

  const fromFence = (question.content || "").match(/```(?:[\w+-]+)?\s*\n([\s\S]*?)```/);
  if (fromFence?.[1]?.trim()) return normalizeSnippetEscapes(fromFence[1].trim());

  return undefined;
}

function resolveImageHint(question: StudioQuestion, templateId: StudioCodeTemplateId | null): string | undefined {
  const direct = (question.imageHint || "").trim();
  if (direct) return direct;

  const fromMeta =
    pickMeta(question.scoringRubric, "imageHint")
    ?? pickMeta(question.scoringRubric, "imagePrompt");
  if (fromMeta) return fromMeta;

  if (templateId) return DEFAULT_IMAGE_HINT_BY_TEMPLATE[templateId];
  return "Tìm hình ảnh hoặc diagram minh họa khái niệm chính trong câu hỏi (slide nội bộ, whiteboard, screenshot).";
}

function isNoCodeQuestionType(type?: string | null): boolean {
  const t = (type || "").trim().toLowerCase();
  return t === "behavioral" || t === "situational";
}

/** Problem-statement snippet only (codeSnippet / content fence) — for mismatch checks. */
export function peekProblemSnippet(question: StudioQuestion): string | undefined {
  return resolveProblemSnippet(question);
}

/** @deprecated Prefer peekProblemSnippet — same source (no expectedAnswer). */
export function peekQuestionSnippet(question: StudioQuestion): string | undefined {
  return peekProblemSnippet(question);
}

/**
 * Suy ra template + snippet + image hint để render UI.
 * Câu lý thuyết thuần vẫn có imageHint; templateId có thể null.
 * Behavioral / Situational: mặc định không render code snippet.
 * Conceptual theory + code-heavy/wrong snippet: ẩn ĐỀ BÀI code (BE data lệch).
 */
export function inferStudioTemplate(question: StudioQuestion): StudioTemplateViewModel {
  const explicit = normalizeTemplateId(question.codeTemplateType);
  const rawSnippet = resolveProblemSnippet(question);
  const noCodeType = isNoCodeQuestionType(question.type);
  const conceptualTheory = isConceptualTheoryQuestion(question.content);
  const languageMismatch = Boolean(
    rawSnippet && hasSnippetLanguageMismatch(question.content, rawSnippet)
  );

  const inferred =
    explicit
    ?? extractFromText(question.content)
    ?? extractFromText(question.scoringRubric)
    ?? (question.type === "SystemDesign" ? "SYSTEM_DESIGN" : null)
    ?? (!noCodeType && !conceptualTheory && !languageMismatch && rawSnippet ? "CODE_COMPLETION" : null);

  const suppressCodeBlock =
    noCodeType
    || languageMismatch
    || (conceptualTheory && Boolean(rawSnippet || isCodeHeavyTemplate(inferred)));

  const snippet = suppressCodeBlock ? undefined : rawSnippet;
  const clearTemplateBadge = suppressCodeBlock && (conceptualTheory || languageMismatch || noCodeType);
  const displayTemplateId = clearTemplateBadge ? null : inferred;

  const imageHint = resolveImageHint(question, displayTemplateId ?? inferred);
  const attachedImageUrl = (question.attachedImageUrl || "").trim() || undefined;

  const langFromMeta =
    pickMeta(question.scoringRubric, "lang")
    ?? pickMeta(question.scoringRubric, "language");
  const snippetLanguage =
    langFromMeta && langFromMeta.toLowerCase() !== "auto"
      ? langFromMeta.trim().toLowerCase()
      : undefined;

  if (noCodeType || (suppressCodeBlock && (conceptualTheory || languageMismatch))) {
    return {
      templateId: null,
      imageHint,
      attachedImageUrl,
      snippetLanguage,
    };
  }

  if (inferred === "SYSTEM_DESIGN") {
    const diagramFromMeta =
      pickMeta(question.scoringRubric, "diagramHint")
      ?? pickMeta(question.scoringRubric, "diagram")
      ?? (rawSnippet && !rawSnippet.includes("{") ? rawSnippet : undefined);

    return {
      templateId: inferred,
      diagramDescription: diagramFromMeta || DEFAULT_DIAGRAM_HINT,
      imageHint,
      attachedImageUrl,
      snippetLanguage,
    };
  }

  return {
    templateId: displayTemplateId,
    snippet,
    snippetLanguage,
    imageHint,
    attachedImageUrl,
  };
}

/** Map câu hỏi History/Review (GeneratedQuestion) → cùng view-model template Studio. */
export function inferGeneratedQuestionTemplate(q: {
  question: string;
  questionType?: string | null;
  difficulty?: string | null;
  rationale?: string | null;
  sampleAnswer?: string | null;
  scoringRubric?: string | null;
  attachedImageUrl?: string | null;
}): StudioTemplateViewModel {
  const metaSource = [q.rationale, q.scoringRubric].filter(Boolean).join(";");
  const templateFromMeta = normalizeTemplateId(pickMeta(metaSource, "template"));
  const snippetFromMetaRaw = pickMeta(metaSource, "snippet");
  const snippetFromMeta = snippetFromMetaRaw
    ? normalizeSnippetEscapes(snippetFromMetaRaw)
    : undefined;
  const hintFromMeta =
    pickMeta(metaSource, "imageHint")
    ?? pickMeta(metaSource, "imagePrompt");
  const diagramFromMeta =
    pickMeta(metaSource, "diagramHint")
    ?? pickMeta(metaSource, "diagram");
  const langFromMeta =
    pickMeta(metaSource, "lang")
    ?? pickMeta(metaSource, "language");

  const qt = (q.questionType || "").toLowerCase();
  const studioType =
    qt.includes("system") ? "SystemDesign"
    : qt.includes("problem") ? "ProblemSolving"
    : qt.includes("behavior") ? "Behavioral"
    : qt.includes("situation") ? "Situational"
    : "Technical";

  const difficultyRaw = (q.difficulty || "Medium");
  const difficulty =
    /easy/i.test(difficultyRaw) ? "Easy"
    : /hard/i.test(difficultyRaw) ? "Hard"
    : "Medium";

  const vm = inferStudioTemplate({
    id: "history",
    content: q.question,
    difficulty: difficulty as StudioQuestion["difficulty"],
    type: studioType as StudioQuestion["type"],
    orderIndex: 0,
    expectedAnswer: q.sampleAnswer,
    scoringRubric: [
      metaSource,
      diagramFromMeta ? `diagramHint=${diagramFromMeta}` : "",
      langFromMeta ? `lang=${langFromMeta}` : "",
    ].filter(Boolean).join(";"),
    codeTemplateType: templateFromMeta,
    codeSnippet: snippetFromMeta || null,
    imageHint: hintFromMeta || null,
    attachedImageUrl: q.attachedImageUrl || null,
  });
  return vm;
}
