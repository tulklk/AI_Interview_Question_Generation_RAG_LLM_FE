/**
 * Question feature service. Question management lives in the same generation
 * engine as the interview feature; this module exposes the question-specific
 * operations as the question feature's public service entry point.
 */
export {
  getJobQuestions,
  updateJobQuestion,
  deleteJobQuestion,
  addJobQuestion,
  reorderJobQuestions,
  saveJobDraft,
  getDraft,
  getDrafts,
  saveGenerationResult,
  exportPlanQuestions,
  askAIAboutQuestion,
  getQuestionAIChat,
} from "@/features/interview/services/interview.service";
export type { QuestionSuggestion } from "@/features/interview/types/generation-session";
