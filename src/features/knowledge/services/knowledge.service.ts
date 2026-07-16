import { apiClient } from "@/core/api/http-client";
import type { KnowledgeDocument, DocumentStatus } from "@/features/knowledge/types/knowledge";

// ---------------------------------------------------------------------------
// RAG Status
// ---------------------------------------------------------------------------

export interface RagCheck {
  name: string;
  status: "pass" | "fail" | "warn";
  message?: string;
}

export interface RagTechnical {
  ragStatus?: string;
  database?: string;
  config?: string;
}

export interface RagStatus {
  isHealthy: boolean;
  summary?: string;
  checks?: RagCheck[];
  serviceUrl?: string;
  responseTimeMs?: number;
  checkedAt?: string;
  technical?: RagTechnical;
}

interface RagStatusResponse {
  data?: RagStatus;
  code?: number;
  message?: string;
}

export async function getAdminRagStatus(): Promise<RagStatus | null> {
  try {
    const { data } = await apiClient.get<RagStatusResponse>("/api/admin/rag/status");
    return (data as RagStatusResponse)?.data ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Backend response shape
// ---------------------------------------------------------------------------

interface BackendDoc {
  id?: string;
  documentId?: string;
  fileName?: string;
  originalFileName?: string;
  fileSize?: number;
  mimeType?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  errorMessage?: string;
  pageCount?: number;
}

interface BackendListResponse {
  data?: BackendDoc[] | { items?: BackendDoc[] };
  items?: BackendDoc[];
  code?: number;
}

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------

function normalizeStatus(raw?: string): DocumentStatus {
  const s = (raw ?? "").toUpperCase();
  if (s === "READY" || s === "COMPLETED") return "READY";
  if (s === "INGESTING" || s === "PROCESSING") return "INGESTING";
  if (s === "FAILED" || s === "ERROR") return "FAILED";
  return "PENDING";
}

function mapDoc(d: BackendDoc): KnowledgeDocument {
  return {
    id: d.id ?? d.documentId ?? "",
    fileName: d.originalFileName ?? d.fileName ?? "Unknown file",
    originalFileName: d.originalFileName,
    fileSize: d.fileSize,
    mimeType: d.mimeType,
    status: normalizeStatus(d.status),
    createdAt: d.createdAt ?? new Date().toISOString(),
    updatedAt: d.updatedAt,
    errorMessage: d.errorMessage,
    pageCount: d.pageCount,
  };
}

function extractList(data: unknown): KnowledgeDocument[] {
  const raw = data as BackendListResponse;
  let items: BackendDoc[] = [];
  if (Array.isArray(raw)) {
    items = raw as BackendDoc[];
  } else if (raw?.data) {
    if (Array.isArray(raw.data)) {
      items = raw.data as BackendDoc[];
    } else if (typeof raw.data === "object" && "items" in raw.data) {
      items = (raw.data as { items?: BackendDoc[] }).items ?? [];
    }
  } else if (raw?.items) {
    items = raw.items;
  }
  return items.map(mapDoc);
}

// ---------------------------------------------------------------------------
// HR Knowledge Documents
// ---------------------------------------------------------------------------

export async function getHrKnowledgeDocs(): Promise<KnowledgeDocument[]> {
  try {
    // BE defaults to PageSize=20 — this page has no pagination UI yet, so
    // request a generous page size rather than silently truncating the list.
    const { data } = await apiClient.get("/api/hr/knowledge-documents", { params: { PageSize: 200 } });
    return extractList(data);
  } catch {
    return [];
  }
}

export async function uploadHrKnowledgeDoc(file: File): Promise<KnowledgeDocument | null> {
  try {
    const form = new FormData();
    form.append("File", file);
    const { data } = await apiClient.post<BackendDoc | { data?: BackendDoc }>(
      "/api/hr/knowledge-documents",
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    const doc = (data as { data?: BackendDoc }).data ?? (data as BackendDoc);
    return doc ? mapDoc(doc) : null;
  } catch {
    return null;
  }
}

export async function deleteHrKnowledgeDoc(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/api/hr/knowledge-documents/${id}`);
    return true;
  } catch {
    return false;
  }
}

export async function reingestHrKnowledgeDoc(id: string): Promise<boolean> {
  try {
    await apiClient.post(`/api/hr/knowledge-documents/${id}/reingest`);
    return true;
  } catch {
    return false;
  }
}

export async function getHrKnowledgeDoc(id: string): Promise<KnowledgeDocument | null> {
  try {
    const { data } = await apiClient.get<BackendDoc | { data?: BackendDoc }>(
      `/api/hr/knowledge-documents/${id}`
    );
    const doc = (data as { data?: BackendDoc }).data ?? (data as BackendDoc);
    return doc ? mapDoc(doc) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Admin Knowledge Documents
// ---------------------------------------------------------------------------

export async function getAdminKnowledgeDocs(): Promise<KnowledgeDocument[]> {
  try {
    const { data } = await apiClient.get("/api/admin/knowledge-documents");
    return extractList(data);
  } catch {
    return [];
  }
}

export async function uploadAdminKnowledgeDoc(file: File): Promise<KnowledgeDocument | null> {
  try {
    const form = new FormData();
    form.append("File", file);
    const { data } = await apiClient.post<BackendDoc | { data?: BackendDoc }>(
      "/api/admin/knowledge-documents",
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    const doc = (data as { data?: BackendDoc }).data ?? (data as BackendDoc);
    return doc ? mapDoc(doc) : null;
  } catch {
    return null;
  }
}

export async function deleteAdminKnowledgeDoc(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/api/admin/knowledge-documents/${id}`);
    return true;
  } catch {
    return false;
  }
}

export async function reingestAdminKnowledgeDoc(id: string): Promise<boolean> {
  try {
    await apiClient.post(`/api/admin/knowledge-documents/${id}/reingest`);
    return true;
  } catch {
    return false;
  }
}

export async function getAdminKnowledgeDoc(id: string): Promise<KnowledgeDocument | null> {
  try {
    const { data } = await apiClient.get<BackendDoc | { data?: BackendDoc }>(
      `/api/admin/knowledge-documents/${id}`
    );
    const doc = (data as { data?: BackendDoc }).data ?? (data as BackendDoc);
    return doc ? mapDoc(doc) : null;
  } catch {
    return null;
  }
}
