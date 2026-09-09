export type GenerationStatus =
  | "PLAN_PROPOSED"
  | "CONFIRMED"
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export type QuestionType =
  | "Technical"
  | "Behavioral"
  | "Situational"
  | "System-design"
  | "Problem-solving";

export type DifficultyLevel = "Easy" | "Medium" | "Hard";

export interface QuestionSuggestion {
  question: string;
  rationale?: string;
  sampleAnswer?: string;
  difficulty?: string;
  questionType?: string;
}

export interface GenerationNote {
  questionCount?: number;
  questionTypes?: QuestionType[];
  focusSkills?: string;
  desiredLevel?: string;
  additionalNote?: string;
}

export interface PlanDraft {
  role: string;
  level: string;
  difficulty?: string;
  questionCount: number;
  questionTypes: QuestionType[];
  topics: string[];
  constraints?: string;
  summary?: string;
}

/** Nguồn RAG gắn câu hỏi — shape khớp Studio (`StudioQuestionCitation`). */
export interface Citation {
  sourceFile: string;
  /** Legacy alias — một số UI cũ đọc `source`. */
  source?: string;
  chunkIndex?: number | null;
  excerpt?: string | null;
  knowledgeBase?: string | null;
  /** HR | SYSTEM | LLM */
  origin?: string | null;
  usedFor?: string[] | null;
  reason?: string | null;
  url?: string;
}

export interface GeneratedQuestion {
  id: string;
  question: string;
  questionType: QuestionType;
  difficulty: DifficultyLevel;
  /** Tech/skill tag (vd. React, SQL) — từ QuestionSetQuestion.Skill. */
  skill?: string;
  /** Focus area (vd. Frontend, Database). */
  focusArea?: string;
  rationale?: string;
  sampleAnswer?: string;
  /** SCRUM-374: scoring rubric (từ evaluationCriteria BE / Studio). */
  scoringRubric?: string;
  /** SCRUM-396: SAS URL ảnh đính kèm (Question Set / History). */
  attachedImageUrl?: string | null;
  /** SCRUM-400: Text | Code — phương thức trả lời Candidate. */
  answerMethod?: "Text" | "Code";
  citations?: Citation[];
  orderIndex: number;
  isEdited?: boolean;
  /** SCRUM-439: soft-active — câu không chọn lúc publish vẫn còn trong DRAFT. */
  isActive?: boolean;
  /** SCRUM-439: đủ sample + rubric để publish. */
  isReady?: boolean;
}

export interface QuestionAIChat {
  id: string;
  questionId: string;
  role: "ai" | "hr";
  content: string;
  timestamp: string;
}

export interface GenerationSession {
  id: string;
  jobTitle: string;
  jdContent?: string;
  note?: GenerationNote;
  hrOwner: string;
  status: GenerationStatus;
  planDraft?: PlanDraft;
  generatedQuestions?: GeneratedQuestion[];
  failureMessage?: string;
  createdAt: string;
  updatedAt: string;
  questionSetId?: string;
  /** SCRUM-374: bộ từ Studio — History hiển thị badge Studio. */
  isFromStudio?: boolean;
}

export interface DraftQuestionSet {
  id: string;
  sessionId: string;
  jobTitle: string;
  /** JD đã lưu trên question set (Studio Save / JdFit attach). */
  jobDescription?: string;
  /** PastedText | UploadedFile */
  jdSourceType?: "PastedText" | "UploadedFile";
  /** Tên file gốc khi JD upload. */
  jdOriginalFileName?: string | null;
  /** Studio project nguồn — fallback đọc meta file nếu thiếu trên set cũ. */
  sourceProjectId?: string | null;
  note?: GenerationNote;
  confirmedPlan?: PlanDraft;
  generatedAt: string;
  status: "DRAFT" | "PUBLISHED";
  /** Candidate practice time limit in minutes (1–480); null = untimed. */
  timeLimitMinutes?: number | null;
  /** SCRUM-424: HR auto-recommend toggle on this set. */
  autoRecommendEnabled?: boolean;
  /** SCRUM-424: min OverallScore (50–95) to create recommendation. */
  recommendationMinScore?: number;
  questions: GeneratedQuestion[];
}
