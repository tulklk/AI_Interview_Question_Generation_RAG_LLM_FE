import { describe, test, expect } from "vitest";
import { inferStudioTemplate, inferGeneratedQuestionTemplate } from "@/features/studio/utils/question-template-infer";
import type { StudioQuestion } from "@/features/studio/types/studio.types";

// Grounded in src/features/studio/utils/question-template-infer.ts — pure
// inference logic (template detection, snippet extraction, meta parsing,
// escape normalization) with no rendering needed. New coverage written to
// broaden the unit-test suite beyond the migrated Playwright scenarios.

function baseQuestion(overrides: Partial<StudioQuestion> = {}): StudioQuestion {
  return {
    id: "q1",
    content: "Explain the difference between REST and GraphQL.",
    difficulty: "Medium",
    type: "Technical",
    orderIndex: 0,
    expectedAnswer: null,
    scoringRubric: null,
    ...overrides,
  } as StudioQuestion;
}

describe("inferStudioTemplate — template detection", () => {
  test("an explicit codeTemplateType wins over everything else", () => {
    // normalizeTemplateId() accepts loosely-cased/garbage input at runtime
    // (defensive against legacy data) — the `as` cast below lies to TS about
    // conformance on purpose, mirroring that real-world laxness.
    const vm = inferStudioTemplate(baseQuestion({ codeTemplateType: "bug_detection" as StudioQuestion["codeTemplateType"], content: "Find the bug" }));
    expect(vm.templateId).toBe("BUG_DETECTION");
  });

  test("normalizes a loosely-cased/spaced explicit template id", () => {
    const vm = inferStudioTemplate(baseQuestion({ codeTemplateType: "  refactoring  " as StudioQuestion["codeTemplateType"] }));
    expect(vm.templateId).toBe("REFACTORING");
  });

  test("an unrecognized explicit template id is ignored, falling through to inference", () => {
    const vm = inferStudioTemplate(baseQuestion({ codeTemplateType: "NOT_A_REAL_TEMPLATE" as StudioQuestion["codeTemplateType"], content: "Design a payment system architecture (system design)." }));
    expect(vm.templateId).toBe("SYSTEM_DESIGN");
  });

  test.each([
    ["Design a system architecture (system design) for a URL shortener.", "SYSTEM_DESIGN"],
    ["Complete the TODO in this function (code completion).", "CODE_COMPLETION"],
    ["Find the bug in this loop.", "BUG_DETECTION"],
    ["Refactor this class to remove duplication.", "REFACTORING"],
    ["Write a unit test case for this function.", "TEST_CASE_DESIGN"],
    ["Analyze the time complexity O(n^2) of this algorithm.", "PERFORMANCE_ANALYSIS"],
  ] as const)("infers %s from question content -> %s", (content, expected) => {
    const vm = inferStudioTemplate(baseQuestion({ content }));
    expect(vm.templateId).toBe(expected);
  });

  test("falls back to scoringRubric text when content has no signal", () => {
    const vm = inferStudioTemplate(baseQuestion({ content: "Neutral prompt.", scoringRubric: "Look for bug handling" }));
    expect(vm.templateId).toBe("BUG_DETECTION");
  });

  test("System-design question TYPE infers SYSTEM_DESIGN even without keyword text", () => {
    const vm = inferStudioTemplate(baseQuestion({ content: "Neutral prompt with no keywords.", type: "SystemDesign" }));
    expect(vm.templateId).toBe("SYSTEM_DESIGN");
  });

  test("a resolvable code snippet with no other signal infers CODE_COMPLETION", () => {
    const vm = inferStudioTemplate(baseQuestion({ content: "Neutral prompt.", codeSnippet: "function foo() { return 1; }" }));
    expect(vm.templateId).toBe("CODE_COMPLETION");
  });

  test("a purely theoretical question with no snippet/keywords has a null templateId but still gets an image hint", () => {
    const vm = inferStudioTemplate(baseQuestion({ content: "Explain the difference between REST and GraphQL." }));
    expect(vm.templateId).toBeNull();
    expect(vm.imageHint).toBeTruthy();
  });
});

describe("inferStudioTemplate — snippet extraction", () => {
  test("prefers question.codeSnippet directly", () => {
    const vm = inferStudioTemplate(baseQuestion({ codeSnippet: "const x = 1;" }));
    expect(vm.snippet).toBe("const x = 1;");
  });

  test('extracts from an expectedAnswer "Code snippet:" marker', () => {
    const vm = inferStudioTemplate(baseQuestion({ expectedAnswer: "Explanation.\nCode snippet:\nconst x = 1;" }));
    expect(vm.snippet).toBe("const x = 1;");
  });

  test("extracts from a fenced code block in content", () => {
    const vm = inferStudioTemplate(baseQuestion({ content: "Fix this:\n```js\nconst x = 1;\n```" }));
    expect(vm.snippet).toBe("const x = 1;");
  });

  test("heuristically detects raw code in expectedAnswer even without a marker", () => {
    const code = "public class Foo {\n  void bar() { return; }\n}";
    const vm = inferStudioTemplate(baseQuestion({ expectedAnswer: code }));
    expect(vm.snippet).toBe(code);
  });

  test("does not mistake plain prose for a code snippet", () => {
    const vm = inferStudioTemplate(baseQuestion({ expectedAnswer: "This is just a plain-language explanation with no code at all." }));
    expect(vm.snippet).toBeUndefined();
  });

  test("normalizes literal \\n / \\t escape sequences into real newlines", () => {
    const vm = inferStudioTemplate(baseQuestion({ codeSnippet: "function foo() {\\n  return 1;\\n}" }));
    expect(vm.snippet).toBe("function foo() {\n  return 1;\n}");
  });
});

describe("inferStudioTemplate — meta parsing (lang/imageHint/diagramHint)", () => {
  test("reads snippetLanguage from scoringRubric's lang= meta, lowercased", () => {
    const vm = inferStudioTemplate(baseQuestion({ codeSnippet: "x", scoringRubric: "lang=TypeScript;template=CODE_COMPLETION" }));
    expect(vm.snippetLanguage).toBe("typescript");
  });

  test('lang=auto is treated as "no explicit language"', () => {
    const vm = inferStudioTemplate(baseQuestion({ codeSnippet: "x", scoringRubric: "lang=auto" }));
    expect(vm.snippetLanguage).toBeUndefined();
  });

  test("question.imageHint wins over template default and meta", () => {
    const vm = inferStudioTemplate(baseQuestion({ imageHint: "Custom hint", codeTemplateType: "BUG_DETECTION" }));
    expect(vm.imageHint).toBe("Custom hint");
  });

  test("falls back to the per-template default image hint when nothing else is set", () => {
    const vm = inferStudioTemplate(baseQuestion({ content: "Find the bug in this loop." }));
    expect(vm.imageHint).toContain("lỗi");
  });

  test("SYSTEM_DESIGN uses diagramHint meta, falling back to the default diagram hint", () => {
    const withMeta = inferStudioTemplate(baseQuestion({
      content: "system design question", scoringRubric: "diagramHint=Look for a sequence diagram",
    }));
    expect(withMeta.diagramDescription).toBe("Look for a sequence diagram");

    const withoutMeta = inferStudioTemplate(baseQuestion({ content: "system design question" }));
    expect(withoutMeta.diagramDescription).toContain("sơ đồ kiến trúc");
  });

  test("attachedImageUrl is trimmed, undefined when blank", () => {
    expect(inferStudioTemplate(baseQuestion({ attachedImageUrl: "  https://x/img.png  " })).attachedImageUrl).toBe("https://x/img.png");
    expect(inferStudioTemplate(baseQuestion({ attachedImageUrl: "   " })).attachedImageUrl).toBeUndefined();
  });
});

describe("inferGeneratedQuestionTemplate — History/Review question mapping", () => {
  test("maps questionType to the Studio type used for inference (system -> SystemDesign)", () => {
    const vm = inferGeneratedQuestionTemplate({
      question: "Design a URL shortener.", questionType: "System Design", difficulty: "Hard",
    });
    expect(vm.templateId).toBe("SYSTEM_DESIGN");
  });

  test("reads template/snippet/lang from rationale+scoringRubric meta (semicolon-joined)", () => {
    const vm = inferGeneratedQuestionTemplate({
      question: "Fix this code.",
      rationale: "template=BUG_DETECTION;lang=Python",
      scoringRubric: "snippet=def foo():\\n    pass",
    });
    expect(vm.templateId).toBe("BUG_DETECTION");
    expect(vm.snippetLanguage).toBe("python");
    expect(vm.snippet).toBe("def foo():\n    pass");
  });

  test("difficulty string is normalized to Easy/Medium/Hard via case-insensitive matching", () => {
    expect(inferGeneratedQuestionTemplate({ question: "q", difficulty: "very easy" }).templateId).toBeNull();
    // difficulty itself isn't exposed on the view-model, but must not throw
    // for any of the three difficulty variants (exercises the branch).
    expect(() => inferGeneratedQuestionTemplate({ question: "q", difficulty: "HARD" })).not.toThrow();
    expect(() => inferGeneratedQuestionTemplate({ question: "q", difficulty: "unrecognized" })).not.toThrow();
  });
});
