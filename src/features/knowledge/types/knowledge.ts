export type DocumentStatus = "PENDING" | "INGESTING" | "READY" | "FAILED" | "PROCESSING";

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
}
