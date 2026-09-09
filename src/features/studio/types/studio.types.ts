export type StudioProjectStatus =
  | "Draft"
  | "Refining"
  | "AwaitingApproval"
  | "Approved"
  | "Generated"
  | "Archived";

export type StudioQuestionDifficulty = "Easy" | "Medium" | "Hard";
export type StudioContentMode = "TheoryOnly" | "CodeOnly" | "Mixed";
export type StudioCodeTemplateId =
  | "CODE_COMPLETION"
  | "BUG_DETECTION"
  | "REFACTORING"
  | "TEST_CASE_DESIGN"
  | "PERFORMANCE_ANALYSIS"
  | "SYSTEM_DESIGN";
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
  questionSetStatus?: string | null;
}

export interface AnalyzeJobDescriptionResponse {
  detectedRole?: string | null;
  detectedSeniority?: string | null;
  detectedLanguage?: string | null;
  skills: string[];
  /** SCRUM-416: vị trí extract từ JD (JobDescription.Title) — HR sửa qua PATCH */
  position?: string | null;
  jobTitle?: string | null;
  experienceLevel?: string | null;
  responsibilities?: string[];
  summary?: string | null;
}

export interface QuestionDistributionItem {
  category: "technical" | "behavioral" | "situational" | string;
  percentage: number;
  questionCount: number;
}

export interface StudioFocusAreaItem {
  name: string;
  weight: number;
  orderIndex: number;
  description?: string | null;
  sourceReason?: string | null;
}

export interface RecommendedConfiguration {
  numberOfQuestions: number;
  difficulty: "easy" | "medium" | "hard" | string;
  questionDistribution: QuestionDistributionItem[];
  focusAreas: StudioFocusAreaItem[];
  questionStyles: string[];
  codingTaskTypes: string[];
  codingTasksRecommended: boolean;
}

export interface RecommendInterviewConfigurationResponse {
  jobProfile: {
    jobTitle?: string | null;
    experienceLevel?: string | null;
    detectedRole?: string | null;
    detectedLanguage?: string | null;
    skills: string[];
    responsibilities: string[];
    summary?: string | null;
  };
  recommendedConfiguration: RecommendedConfiguration;
}

export interface JobDescriptionContent {
  content: string;
  sourceType: "PastedText" | "UploadedFile";
  originalFileName?: string | null;
  wordCount: number;
  characterCount: number;
  summary?: AnalyzeJobDescriptionResponse | null;
  /** SCRUM-416: top-level position (đồng bộ Title trên BE) */
  position?: string | null;
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
  /** SCRUM-419: HR | SYSTEM */
  scope?: "HR" | "SYSTEM";
  /** SCRUM-442 */
  documentType?: string;
}

/** SCRUM-373: doc trong KB HR để chọn gắn vào Studio */
export interface StudioLibraryDocument {
  knowledgeDocumentId: string;
  fileName: string;
  status: string;
  chunkCount?: number | null;
  createdAt: string;
  alreadyAttached: boolean;
  /** SCRUM-419: HR | SYSTEM */
  scope?: "HR" | "SYSTEM";
  /** SCRUM-442 */
  documentType?: string;
}

/** SCRUM-443 */
export interface StudioKnowledgeSuggestion {
  knowledgeDocumentId: string;
  fileName: string;
  documentType: string;
  maxScore: number;
  hitCount: number;
  topExcerpt?: string | null;
}

/** SCRUM-444 */
export interface StudioRetrievePreviewChunk {
  chunkIndex: number;
  content: string;
  score: number;
  fileName?: string | null;
}

export interface StudioRetrievePreview {
  knowledgeDocumentId: string;
  chunks: StudioRetrievePreviewChunk[];
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

/** Slot preview / chỉnh trước Generate — map recommendedQuestionOutline. */
export interface PlanOutlineItem {
  order: number;
  type: string;
  difficulty: string;
  skill: string;
  focusArea: string;
  goal: string;
  /** Text = lý thuyết | Code = coding */
  answerMethod: "Text" | "Code";
  /** SCRUM-426: nguồn JD + Admin đã khóa trên slot */
  citations?: StudioQuestionCitation[];
}

/** SCRUM-419 / SCRUM-420: nguồn plan kèm scope */
export type PlanSourceScope = "JD" | "HR" | "SYSTEM" | "LLM";

export interface PlanProvenanceItem {
  origin: PlanSourceScope;
  sourceFile?: string | null;
  chunkIndex?: number | null;
  excerpt?: string | null;
  usedFor?: string[];
  reason?: string | null;
}

export interface PlanProvenanceBlock {
  primaryOrigin: PlanSourceScope;
  items: PlanProvenanceItem[];
}

export interface PlanCoverageItem {
  skill: string;
  questionCount: number;
  focusAreas: string[];
  sourceFiles: string[];
  provenance?: PlanProvenanceBlock | null;
}

export interface PlanFocusAreaItem {
  name: string;
  weight: number;
  orderIndex: number;
  /** SCRUM-369: tên file RAG (source_file) gắn focus */
  sourceFiles?: string[];
  /** SCRUM-420: HR | SYSTEM | LLM */
  primaryOrigin?: PlanSourceScope | null;
  provenance?: PlanProvenanceBlock | null;
}

export interface PlanSourceUsed {
  name: string;
  scope?: PlanSourceScope | null;
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
  /** BE: HR settings changed after plan snapshot — regenerate required */
  isSettingsStale?: boolean;
  sourcesUsed: string[];
  /** SCRUM-419: sourcesUsed kèm scope HR/Admin/JD/LLM */
  sourceDetails?: PlanSourceUsed[];
  /** SCRUM-420: coverage kèm provenance */
  coverage?: PlanCoverageItem[];
  /** Live preview slots từ recommendedQuestionOutline */
  outlineItems?: PlanOutlineItem[];
  /** RAG | StudioSettingsPatch — gate bước 2 preview sau Apply */
  generatedByModelName?: string | null;
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
  /** Vietnamese | English — ngôn ngữ đầu ra của câu hỏi được sinh */
  outputLanguage: string;
  /** SCRUM-370: technical | system_design | problem_solving | behavioral | situational */
  questionTypes: string[];
  contentMode?: StudioContentMode;
  enabledCodeTemplates?: StudioCodeTemplateId[];
  /** HR-approved focus areas (Phase 1 AI config) */
  focusAreas?: StudioFocusAreaItem[];
  questionDistribution?: QuestionDistributionItem[];
  questionStyles?: string[];
  /** AI draft snapshot — read-only from GET */
  recommendedConfiguration?: RecommendedConfiguration | null;
  recommendedGeneratedAt?: string | null;
  readiness: StudioReadiness;
}

/** SCRUM-388: refine chat trả settings đã sync + citations */
export interface PlanRefineResult extends PlanSummary {
  settings: StudioSettings;
  changedFields: string[];
  citationSourceFiles: string[];
  assistantMessage: string;
}

export interface ApplyPlanSettingsPayload {
  numberOfQuestions: number;
  difficulty: StudioQuestionDifficulty;
  interviewLengthMinutes: number;
  questionTypes: string[];
  questionDistribution?: QuestionDistributionItem[];
  focusAreas?: StudioFocusAreaItem[];
  questionStyles?: string[];
  codingTaskTypes?: string[];
  outlineItems?: PlanOutlineItem[];
}

export interface StudioQuestionCitation {
  sourceFile: string;
  chunkIndex?: number | null;
  excerpt?: string | null;
  /** SCRUM-419: hr | system từ RAG */
  knowledgeBase?: string | null;
  /** SCRUM-421: HR | SYSTEM | LLM */
  origin?: PlanSourceScope | null;
  usedFor?: string[] | null;
  reason?: string | null;
}

export interface StudioQuestion {
  id: string;
  content: string;
  difficulty: StudioQuestionDifficulty;
  type: StudioQuestionType;
  orderIndex: number;
  expectedAnswer?: string | null;
  scoringRubric?: string | null;
  /** SCRUM-418: RubricV1 JSON từ BE */
  rubricJson?: string | null;
  /** SCRUM-390: nguồn tài liệu RAG gắn câu hỏi */
  citations?: StudioQuestionCitation[];
  codeTemplateType?: StudioCodeTemplateId | null;
  codeSnippet?: string | null;
  /** SCRUM-396: gợi ý hình ảnh/diagram cho HR (text từ AI) */
  imageHint?: string | null;
  /** SCRUM-396: SAS URL ảnh đính kèm (Azure Blob) */
  attachedImageUrl?: string | null;
  /** SCRUM-400: Text | Code */
  answerMethod?: "Text" | "Code" | null;
  /** SCRUM-421: provenance tóm tắt */
  sourceProvenance?: PlanProvenanceBlock | null;
  /** SCRUM-421: cảnh báo thiếu tài liệu Admin */
  missingAdminWarning?: boolean;
  /** SCRUM-427: lý do hỏi (khóa từ outline.goal) */
  rationale?: string | null;
  /** SCRUM-436: skill/tech từ outline TagsJson — badge UI */
  skill?: string | null;
  focusArea?: string | null;
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
  /** SCRUM-429: regen nền — id câu đang regen (null = generate full) */
  targetQuestionId?: string | null;
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

