export type HistoryPublishStatus = "DRAFT" | "PUBLISHED";

/** Bộ lọc danh sách Bộ câu hỏi (sidebar nav / URL ?filter=). */
export type QuestionSetsFilterKey = "all" | "DRAFT" | "PUBLISHED" | "bookmarked";

/** SCRUM-391: một dòng History = Question Set đã Save. */
export interface HistoryQuestionSetItem {
  questionSetId: string;
  title: string;
  status: HistoryPublishStatus;
  questionCount: number;
  isBookmarked: boolean;
  sourceProjectId?: string | null;
  jobId?: string | null;
  savedAt: string;
  publishedAt?: string | null;
}
