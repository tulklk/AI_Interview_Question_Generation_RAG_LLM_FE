export type StudioProjectStatus =
  | "Draft"
  | "Refining"
  | "AwaitingApproval"
  | "Approved"
  | "Generated"
  | "Archived";

export type StudioQuestionDifficulty = "Easy" | "Medium" | "Hard";
export type StudioQuestionType =
  | "Technical"
  | "Behavioral"
  | "SystemDesign"
  | "ProblemSolving"
  | "Situational"
  | "FollowUp";

export interface StudioProject {
  id: string;
  name: string;
  description?: string | null;
  status: StudioProjectStatus;
  isPublished?: boolean;
  questionSetId?: string | null;
}

export interface StudioProjectDetail extends StudioProject {
  ownerId: string;
  latestPlanRevision: number;
}

export interface AnalyzeJobDescriptionResponse {
  detectedRole?: string | null;
  detectedSeniority?: string | null;
  detectedLanguage?: string | null;
  skills: string[];
}

export interface JobDescriptionContent {
  content: string;
  sourceType: "PastedText" | "UploadedFile";
  originalFileName?: string | null;
  wordCount: number;
  characterCount: number;
  summary?: AnalyzeJobDescriptionResponse | null;
}

export interface UploadJobDescriptionResponse {
  content: string;
  originalFileName?: string | null;
  sourceType: "PastedText" | "UploadedFile";
  wordCount: number;
  characterCount: number;
  summary: AnalyzeJobDescriptionResponse;
}

export interface StudioDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  isSelected: boolean;
  status: "Pending" | "Processing" | "Completed" | "Failed";
  previewText?: string | null;
  /** Link knowledge_documents (RAG pipeline HR cũ) */
  knowledgeDocumentId?: string | null;
  /** QUEUED | PROCESSING | COMPLETED | FAILED */
  ragStatus?: string | null;
  chunkCount?: number | null;
  processingError?: string | null;
  /** SCRUM-373: gắn từ Knowledge Documents (không upload mới) */
  isLibraryLink?: boolean;
}

/** SCRUM-373: doc trong KB HR để chọn gắn vào Studio */
export interface StudioLibraryDocument {
  knowledgeDocumentId: string;
  fileName: string;
  status: string;
  chunkCount?: number | null;
  createdAt: string;
  alreadyAttached: boolean;
}

export interface PlanSummary {
  id: string;
  revision: number;
  title: string;
  status: "Draft" | "Refining" | "AwaitingApproval" | "Approved" | "Superseded" | "Rejected";
  totalQuestions: number;
}

export interface PlanSectionItem {
  id: string;
  name: string;
  description?: string | null;
  orderIndex: number;
  numberOfQuestions: number;
  difficulty: StudioQuestionDifficulty;
  estimatedMinutes: number;
}

export interface PlanFocusAreaItem {
  name: string;
  weight: number;
  orderIndex: number;
  /** SCRUM-369: tên file RAG (source_file) gắn focus */
  sourceFiles?: string[];
}

export interface PlanDetail {
  id: string;
  projectId: string;
  revision: number;
  title: string;
  status: PlanSummary["status"];
  totalQuestions: number;
  interviewLengthMinutes: number;
  difficulty: StudioQuestionDifficulty;
  difficultyMix: { easy: number; medium: number; hard: number };
  focusAreas: PlanFocusAreaItem[];
  sourcesUsed: string[];
  estimatedSections: PlanSectionItem[];
  sections: PlanSectionItem[];
  concurrencyVersion: string;
}

export interface PlanApprovalHistoryItem {
  id: string;
  revision: number;
  action: "Approved" | "Rejected";
  actorId: string;
  createdAt: string;
  notes?: string | null;
}

export interface StudioReadiness {
  hasJobDescription: boolean;
  hasSelectedDocument: boolean;
  hasAwaitingApprovalPlan: boolean;
  hasApprovedPlan: boolean;
  canGenerateQuestions: boolean;
}

export interface StudioSettings {
  projectId: string;
  appliedPlanId?: string | null;
  interviewLengthMinutes: number;
  numberOfQuestions: number;
  difficulty: StudioQuestionDifficulty;
  questionTone: string;
  includeSampleAnswers: boolean;
  includeScoringRubric: boolean;
  outputFormat: string;
  /** SCRUM-370: technical | system_design | problem_solving | behavioral | situational */
  questionTypes: string[];
  readiness: StudioReadiness;
}

export interface ApplyPlanSettingsPayload {
  numberOfQuestions: number;
  difficulty: StudioQuestionDifficulty;
  interviewLengthMinutes: number;
  questionTypes: string[];
}

export interface StudioQuestion {
  id: string;
  content: string;
  difficulty: StudioQuestionDifficulty;
  type: StudioQuestionType;
  orderIndex: number;
  expectedAnswer?: string | null;
  scoringRubric?: string | null;
}

export interface StudioQuestionListResponse {
  page: number;
  pageSize: number;
  total: number;
  items: StudioQuestion[];
}

export interface GenerationRun {
  id: string;
  planId: string;
  status: "Pending" | "Generating" | "Completed" | "Failed" | "Cancelled";
  requestedQuestionCount: number;
  generatedQuestionCount: number;
  startedAt: string;
  completedAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface ShareLink {
  id: string;
  token: string;
  permission: "View" | "Edit";
  expiresAt?: string | null;
  isActive: boolean;
}

export interface ChatSession {
  sessionId: string;
  projectId: string;
  userId: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "User" | "Assistant" | "System";
  content: string;
  status: "Pending" | "Streaming" | "Completed" | "Failed" | "Cancelled";
  createdAt: string;
}

export type StudioSseEventName = "message.started" | "message.delta" | "message.completed" | "message.failed";

