export type StudioContentMode = "TheoryOnly" | "CodeOnly" | "Mixed";

export type StudioCodeTemplateId =
  | "CODE_COMPLETION"
  | "BUG_DETECTION"
  | "REFACTORING"
  | "TEST_CASE_DESIGN"
  | "PERFORMANCE_ANALYSIS"
  | "SYSTEM_DESIGN";

export interface StudioQuestionTemplateDef {
  id: StudioCodeTemplateId;
  label: string;
  defaultType: "problem_solving" | "system_design";
}

export const STUDIO_QUESTION_TEMPLATES: StudioQuestionTemplateDef[] = [
  { id: "CODE_COMPLETION", label: "Code completion", defaultType: "problem_solving" },
  { id: "BUG_DETECTION", label: "Bug detection", defaultType: "problem_solving" },
  { id: "REFACTORING", label: "Refactoring", defaultType: "problem_solving" },
  { id: "TEST_CASE_DESIGN", label: "Test case design", defaultType: "problem_solving" },
  { id: "PERFORMANCE_ANALYSIS", label: "Performance analysis", defaultType: "problem_solving" },
  { id: "SYSTEM_DESIGN", label: "System design", defaultType: "system_design" },
];

export const DEFAULT_ENABLED_CODE_TEMPLATES: StudioCodeTemplateId[] = [
  "BUG_DETECTION",
  "CODE_COMPLETION",
  "REFACTORING",
  "PERFORMANCE_ANALYSIS",
];

