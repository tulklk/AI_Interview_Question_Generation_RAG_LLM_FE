/**
 * Question feature service — Question Set CRUD + Ask AI (flag tạm tắt).
 */
export {
  getDraft,
  getDrafts,
  updateQuestionSetQuestion,
  deleteQuestionSetQuestion,
  addQuestionSetQuestion,
  reorderQuestionSetQuestions,
  askAIAboutQuestion,
  getQuestionAIChat,
} from "@/features/interview/services/interview.service";
export type { QuestionSuggestion } from "@/features/interview/types/generation-session";
