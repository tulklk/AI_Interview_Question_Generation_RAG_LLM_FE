export type GenerationStatus =
  | "DRAFT"
  | "PLAN_PROPOSED"
  | "CONFIRMED"
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export type QuestionType = "Technical" | "Behavioral" | "Situational" | "Competency-based";
export type DifficultyLevel = "Easy" | "Medium" | "Hard";

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
  questionCount: number;
  questionTypes: QuestionType[];
  topics: string[];
  constraints?: string;
  summary?: string;
}

export interface ClarifyMessage {
  id: string;
  role: "ai" | "hr";
  content: string;
  timestamp: string;
}

export interface Citation {
  source: string;
  excerpt?: string;
  url?: string;
}

export interface GeneratedQuestion {
  id: string;
  question: string;
  questionType: QuestionType;
  difficulty: DifficultyLevel;
  rationale?: string;
  sampleAnswer?: string;
  citations?: Citation[];
  orderIndex: number;
  isEdited?: boolean;
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
  jdFilePath?: string;
  note?: GenerationNote;
  hrOwner: string;
  status: GenerationStatus;
  planDraft?: PlanDraft;
  clarifyHistory?: ClarifyMessage[];
  generatedQuestions?: GeneratedQuestion[];
  failureCode?: string;
  failureMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftQuestionSet {
  id: string;
  sessionId: string;
  jobTitle: string;
  jdReference?: string;
  note?: GenerationNote;
  confirmedPlan?: PlanDraft;
  generatedAt: string;
  status: "DRAFT" | "PUBLISHED";
  questions: GeneratedQuestion[];
}
