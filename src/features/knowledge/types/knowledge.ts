export type DocumentStatus = "PENDING" | "INGESTING" | "READY" | "FAILED" | "PROCESSING";

/** SCRUM-442 / SCRUM-447: loại tài liệu Knowledge */
export type KnowledgeDocumentType =
  | "Policy"
  | "InternalStack"
  | "Roadmap"
  | "Rubric"
  | "RolePack"
  | "Unclassified";

export const HR_DOCUMENT_TYPES: KnowledgeDocumentType[] = [
  "Policy",
  "InternalStack",
  "Rubric",
  "RolePack",
];

/** SCRUM-447: loại tài liệu Admin Knowledge (SYSTEM scope) */
export const ADMIN_DOCUMENT_TYPES: KnowledgeDocumentType[] = [
  "InternalStack",
  "Roadmap",
  "RolePack",
  "Policy",
  "Rubric",
];

/** Nhãn thư mục ảo trên UI Admin — map documentType → folder label */
export const ADMIN_VIRTUAL_FOLDER_LABELS: Partial<Record<KnowledgeDocumentType, string>> = {
  InternalStack: "Tech",
  Roadmap: "Roadmap",
};

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
  /** SCRUM-447: ghi chú nội bộ admin */
  adminNote?: string | null;
  /** SCRUM-450: nhóm folder UI (null = unsorted) */
  folder?: string | null;
  /** Đường dẫn lưu trữ (nếu BE trả về) — không liệt kê Azure blob trực tiếp */
  storagePath?: string;
}

/** SCRUM-450: folder grouping trên Admin Knowledge */
export interface KnowledgeFolderItem {
  name: string;
  count: number;
}

export interface KnowledgeChunkPreview {
  chunkId: string;
  chunkIndex: number;
  content: string;
}
