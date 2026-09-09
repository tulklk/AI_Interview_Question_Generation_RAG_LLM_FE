export type DocumentStatus = "PENDING" | "INGESTING" | "READY" | "FAILED" | "PROCESSING";

/** SCRUM-442: loại tài liệu HR Knowledge */
export type KnowledgeDocumentType =
  | "Policy"
  | "InternalStack"
  | "Rubric"
  | "RolePack"
  | "Unclassified";

export const HR_DOCUMENT_TYPES: KnowledgeDocumentType[] = [
  "Policy",
  "InternalStack",
  "Rubric",
  "RolePack",
];

export interface KnowledgeDocument {
  id: string;
  fileName: string;
  originalFileName?: string;
  fileSize?: number;
  mimeType?: string;
  status: DocumentStatus;
  createdAt: string;
  updatedAt?: string;
  errorMessage?: string;
  pageCount?: number;
  /** SCRUM-442 */
  documentType?: KnowledgeDocumentType;
  chunkCount?: number;
  /** SCRUM-444 */
  citationCount?: number;
  studioProjectCount?: number;
}

export interface KnowledgeChunkPreview {
  chunkId: string;
  chunkIndex: number;
  content: string;
}
