import { guessCodeLanguage } from "@/shared/components/ui/code-snippet-block";

/** Canonical language ids used for comparison. */
type LangId = "sql" | "csharp" | "javascript" | "python" | "java" | "go" | "rust" | "php" | "cpp" | "kotlin" | null;

const CODE_HEAVY_TEMPLATES = new Set([
  "CODE_COMPLETION",
  "BUG_DETECTION",
  "REFACTORING",
  "TEST_CASE_DESIGN",
  "PERFORMANCE_ANALYSIS",
]);

function normalizeLang(raw: string | null | undefined): LangId {
  const l = (raw || "").trim().toLowerCase();
  if (!l || l === "code" || l === "auto") return null;
  if (l === "sql" || l === "tsql" || l === "plsql") return "sql";
  if (l === "csharp" || l === "c#" || l === "cs") return "csharp";
  if (l === "javascript" || l === "js" || l === "typescript" || l === "ts" || l === "jsx" || l === "tsx") {
    return "javascript";
  }
  if (l === "python" || l === "py") return "python";
  if (l === "java") return "java";
  if (l === "go" || l === "golang") return "go";
  if (l === "rust" || l === "rs") return "rust";
  if (l === "php") return "php";
  if (l === "cpp" || l === "c++" || l === "cplusplus") return "cpp";
  if (l === "kotlin" || l === "kt") return "kotlin";
  return null;
}

/** Infer expected language from question text (keywords only). */
export function inferLanguageFromQuestionText(content: string): LangId {
  const t = content || "";
  if (/\b(SQL|T-SQL|PostgreSQL|MySQL|SELECT\s+|JOIN\s+|câu lệnh SQL|truy vấn SQL)\b/i.test(t)) return "sql";
  if (/\b(C#|CSharp|\.NET|ASP\.NET|Entity Framework|LINQ)\b/i.test(t)) return "csharp";
  if (/\b(React|JSX|TypeScript|JavaScript|Node\.js|useState|useMemo|useCallback|Next\.js)\b/i.test(t)) {
    return "javascript";
  }
  if (/\b(Python|Django|Flask|FastAPI|pandas)\b/i.test(t)) return "python";
  if (/\b(Java\b|Spring Boot|JVM|Jakarta)\b/i.test(t)) return "java";
  if (/\b(Golang|\bGo\b|goroutine)\b/i.test(t)) return "go";
  if (/\b(Rust|cargo)\b/i.test(t)) return "rust";
  if (/\b(PHP|Laravel)\b/i.test(t)) return "php";
  if (/\b(C\+\+|cpp)\b/i.test(t)) return "cpp";
  if (/\b(Kotlin)\b/i.test(t)) return "kotlin";
  return null;
}

/** True when question text language intent ≠ snippet language (e.g. React vs C#). */
export function hasSnippetLanguageMismatch(
  content: string,
  snippet: string,
  snippetLanguage?: string | null
): boolean {
  const expected = inferLanguageFromQuestionText(content);
  const actual =
    normalizeLang(snippetLanguage) ||
    normalizeLang(guessCodeLanguage(snippet));
  return Boolean(expected && actual && expected !== actual);
}

function isTheoryArchitectureQuestion(content: string): boolean {
  const t = content || "";
  return (
    /\b(Service Layer|Controller|kiến trúc|architecture|vai trò gì|why (should|shouldn't)|tại sao)\b/i.test(t) &&
    !/\b(viết|write|implement|complete the|fix the bug|refactor|SQL|code sau|đoạn code)\b/i.test(t)
  );
}

/** Prompt asks to edit / complete / find bug / write query — not pure theory. */
export function isExplicitCodeTask(content: string): boolean {
  const t = content || "";
  return /\b(refactor|đoạn code|complete the|find the bug|fix the bug|implement|code sau|viết hàm|hoàn thành|TODO|fix the|TypeScript sau|JavaScript sau|C# sau|điền|bug detection|hoàn thành hàm|viết (một |hàm |câu |query |truy vấn |SQL)|truy vấn|write (a )?query|SELECT|câu lệnh SQL)\b/i.test(
    t
  );
}

/** Conceptual / explain-theory prompts (Value Type, useMemo “khi nào”, …). */
export function isConceptualTheoryQuestion(content: string): boolean {
  const t = content || "";
  const conceptual =
    /\b(sự khác biệt|khác biệt giữa|là gì|what is|what are|explain|giải thích|Value Type|Reference Type|Stack|Heap|khái niệm|so sánh|định nghĩa|phân biệt|abstract class|interface|khi nào|khi nào nên|nên sử dụng|trong trường hợp nào|when (should|to|would)( you)? use|useMemo|useCallback|useEffect|hooks?|tối ưu hóa render|render optimization)\b/i.test(
      t
    );
  return conceptual && !isExplicitCodeTask(t);
}

function isNoCodeQuestionType(type?: string | null): boolean {
  const t = (type || "").trim().toLowerCase();
  return t === "behavioral" || t === "situational";
}

export function isCodeHeavyTemplate(templateId?: string | null): boolean {
  return CODE_HEAVY_TEMPLATES.has((templateId || "").toUpperCase());
}

/** Significant PascalCase / camelCase identifiers from snippet (len ≥ 4). */
function extractSnippetIdentifiers(snippet: string): string[] {
  const matches = snippet.match(/\b[A-Za-z_][A-Za-z0-9_]{3,}\b/g) ?? [];
  const skip = new Set([
    "public",
    "private",
    "protected",
    "static",
    "void",
    "return",
    "const",
    "function",
    "class",
    "string",
    "number",
    "int",
    "bool",
    "true",
    "false",
    "null",
    "this",
    "var",
    "let",
    "async",
    "await",
    "from",
    "import",
    "export",
    "using",
    "namespace",
    "Length",
    "length",
    "Count",
    "count",
  ]);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    if (skip.has(m) || skip.has(m.toLowerCase())) continue;
    // Prefer identifiers that look like method/type names
    if (!/[A-Z]/.test(m) && m.length < 6) continue;
    const key = m.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out.slice(0, 12);
}

function snippetIdentifiersMissingFromContent(content: string, snippet: string): boolean {
  const ids = extractSnippetIdentifiers(snippet);
  if (ids.length === 0) return false;
  const lower = content.toLowerCase();
  // Flag when none of the significant identifiers appear in the question text
  return ids.every((id) => !lower.includes(id.toLowerCase()));
}

/**
 * Soft FE check: question intent vs code snippet language / theory-vs-code mismatch.
 * Returns true when a warning chip should be shown.
 */
export function hasQuestionCodeMismatch(params: {
  content: string;
  snippet?: string | null;
  /** Raw snippet still on the question even if UI suppresses it (Behavioral/Situational). */
  rawSnippet?: string | null;
  snippetLanguage?: string | null;
  templateId?: string | null;
  questionType?: string | null;
}): boolean {
  const content = params.content || "";
  const snippet = (params.snippet || params.rawSnippet || "").trim();
  if (!snippet) return false;

  // Behavioral / Situational should not carry code — flag for Needs review even if UI hides it
  if (isNoCodeQuestionType(params.questionType)) return true;

  if (hasSnippetLanguageMismatch(content, snippet, params.snippetLanguage)) return true;

  const tid = (params.templateId || "").toUpperCase();
  const codeHeavy = isCodeHeavyTemplate(tid);
  const lineCount = snippet.split("\n").length;

  // Conceptual theory (Value Type / useMemo “khi nào” / …) + code-heavy template or multi-line snippet
  if (isConceptualTheoryQuestion(content) && (codeHeavy || lineCount >= 4)) {
    return true;
  }

  // Legacy architecture theory + long code-heavy snippet
  if (isTheoryArchitectureQuestion(content) && codeHeavy && lineCount >= 6) {
    return true;
  }

  // Code-heavy + identifiers never in prompt — skip when prompt is an explicit code task
  // (refactor / “đoạn code sau…” often omits the function name on purpose)
  if (
    codeHeavy &&
    !isExplicitCodeTask(content) &&
    snippetIdentifiersMissingFromContent(content, snippet)
  ) {
    return true;
  }

  return false;
}
