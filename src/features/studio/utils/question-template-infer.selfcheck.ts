/**
 * Kiểm tra nhanh (chạy bằng: npx --yes tsx src/features/studio/utils/question-template-infer.selfcheck.ts)
 * FE chưa có vitest — self-check thay unit test cho rule code-heavy stem.
 */
import { inferStudioTemplate } from "./question-template-infer";
import type { StudioQuestion } from "@/features/studio/types/studio.types";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const bugDetection: StudioQuestion = {
  id: "q1",
  content:
    "Hãy phân tích đoạn code sau. Tìm lỗi logic liên quan over-posting và đề xuất cách sửa.",
  type: "Technical",
  difficulty: "Hard",
  orderIndex: 13,
  expectedAnswer: "Dùng DTO thay entity.",
  scoringRubric: null,
  codeTemplateType: "BUG_DETECTION",
  codeSnippet:
    '[HttpPut("{id}")]\npublic async Task<IActionResult> Update(int id, User user) { _db.Update(user); return Ok(); }',
  answerMethod: "Text",
};

const view = inferStudioTemplate(bugDetection);
assert(view.snippet && view.snippet.includes("HttpPut"), "BUG_DETECTION + codeSnippet phải hiện đề");
assert(view.templateId === "BUG_DETECTION", "template badge BUG_DETECTION");

console.log("question-template-infer.selfcheck: OK");
