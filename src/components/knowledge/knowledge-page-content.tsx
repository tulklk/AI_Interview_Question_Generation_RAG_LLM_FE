"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Upload,
  FileText,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  CloudUpload,
  X,
  RefreshCw,
  FilePlus2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { portalHeading, portalSubtext, portalInput, portalDivider } from "@/lib/portal-ui";
import type { KnowledgeDocument, DocumentStatus } from "@/types/knowledge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KnowledgePageContentProps {
  variant: "hr" | "admin";
  onFetchDocs: () => Promise<KnowledgeDocument[]>;
  onUpload: (file: File) => Promise<KnowledgeDocument | null>;
  onDelete: (id: string) => Promise<boolean>;
  onReingest: (id: string) => Promise<boolean>;
  onRefreshDoc?: (id: string) => Promise<KnowledgeDocument | null>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
];
const ACCEPTED_EXT = [".pdf", ".docx", ".doc", ".txt"];
const MAX_FILE_MB = 20;

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  if (diff < 7) return `${diff} ngày trước`;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fileIcon(mimeType?: string): string {
  if (!mimeType) return "📄";
  if (mimeType.includes("pdf")) return "📕";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📘";
  return "📄";
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: DocumentStatus }) {
  const map: Record<DocumentStatus, { label: string; className: string; icon: React.ReactNode }> = {
    READY: {
      label: "Sẵn sàng",
      className: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      icon: <CheckCircle2 size={11} />,
    },
    INGESTING: {
      label: "Đang xử lý",
      className: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      icon: <Loader2 size={11} className="animate-spin" />,
    },
    PROCESSING: {
      label: "Đang xử lý",
      className: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      icon: <Loader2 size={11} className="animate-spin" />,
    },
    PENDING: {
      label: "Chờ xử lý",
      className: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      icon: <Loader2 size={11} className="animate-spin" />,
    },
    FAILED: {
      label: "Thất bại",
      className: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
      icon: <AlertCircle size={11} />,
    },
  };
  const { label, className, icon } = map[status] ?? map.PENDING;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border", className)}>
      {icon}
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Document card
// ---------------------------------------------------------------------------

function DocumentCard({
  doc,
  onDelete,
  onReingest,
  deleting,
  reingesting,
}: {
  doc: KnowledgeDocument;
  onDelete: (id: string) => void;
  onReingest: (id: string) => void;
  deleting: boolean;
  reingesting: boolean;
}) {
  const isProcessing = doc.status === "INGESTING" || doc.status === "PROCESSING" || doc.status === "PENDING";
  return (
    <div className={cn(
      "group relative flex flex-col gap-3 p-4 rounded-xl border transition-all duration-200",
      "bg-white dark:bg-gray-900/80 border-gray-100 dark:border-gray-800",
      "hover:border-violet-200 dark:hover:border-violet-800 hover:shadow-md dark:hover:shadow-violet-950/20",
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg",
          doc.status === "READY"
            ? "bg-emerald-50 dark:bg-emerald-950/40"
            : doc.status === "FAILED"
            ? "bg-red-50 dark:bg-red-950/30"
            : "bg-blue-50 dark:bg-blue-950/30",
        )}>
          {fileIcon(doc.mimeType)}
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold leading-snug truncate", portalHeading)} title={doc.fileName}>
            {doc.fileName}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusBadge status={doc.status} />
            {doc.fileSize && (
              <span className={cn("text-[11px]", portalSubtext)}>{formatBytes(doc.fileSize)}</span>
            )}
            {doc.pageCount && (
              <span className={cn("text-[11px]", portalSubtext)}>{doc.pageCount} trang</span>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {doc.status === "FAILED" && doc.errorMessage && (
        <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2 line-clamp-2">
          {doc.errorMessage}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 dark:border-gray-800">
        <span className={cn("text-[11px]", portalSubtext)}>{formatDate(doc.createdAt)}</span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {doc.status === "FAILED" && (
            <button
              type="button"
              onClick={() => onReingest(doc.id)}
              disabled={reingesting}
              title="Xử lý lại"
              className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors disabled:opacity-50"
            >
              {reingesting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
            </button>
          )}
          {isProcessing && (
            <button
              type="button"
              onClick={() => onReingest(doc.id)}
              disabled={reingesting}
              title="Thử lại"
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(doc.id)}
            disabled={deleting}
            title="Xóa tài liệu"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload zone
// ---------------------------------------------------------------------------

function UploadZone({
  onFiles,
  uploading,
  uploadingFileName,
}: {
  onFiles: (files: File[]) => void;
  uploading: boolean;
  uploadingFileName: string;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ACCEPTED_TYPES.includes(f.type) || ACCEPTED_EXT.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (files.length) onFiles(files);
  }, [onFiles]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={cn(
        "relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed",
        "cursor-pointer transition-all duration-200 py-14 px-8 text-center select-none",
        dragging
          ? "border-violet-400 bg-violet-50/60 dark:bg-violet-950/30 scale-[1.01]"
          : "border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/30 dark:hover:bg-violet-950/10",
        uploading && "pointer-events-none opacity-70",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPTED_EXT.join(",")}
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />

      <div className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors",
        dragging ? "bg-violet-100 dark:bg-violet-900/40" : "bg-gray-100 dark:bg-gray-800",
      )}>
        {uploading
          ? <Loader2 size={28} className="text-violet-500 animate-spin" />
          : <CloudUpload size={28} className={cn("transition-colors", dragging ? "text-violet-500" : "text-gray-400 dark:text-gray-500")} />
        }
      </div>

      {uploading ? (
        <div className="space-y-1">
          <p className={cn("text-sm font-semibold", portalHeading)}>Đang tải lên...</p>
          <p className={cn("text-xs truncate max-w-65", portalSubtext)}>{uploadingFileName}</p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className={cn("text-sm font-semibold", portalHeading)}>
            Kéo thả tài liệu vào đây
          </p>
          <p className={cn("text-xs", portalSubtext)}>
            hoặc <span className="text-violet-600 dark:text-violet-400 font-medium">nhấp để chọn file</span>
          </p>
          <p className={cn("text-[11px] mt-1", portalSubtext)}>
            PDF, DOCX, DOC, TXT · Tối đa {MAX_FILE_MB} MB mỗi file
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete confirm modal
// ---------------------------------------------------------------------------

function DeleteModal({
  fileName,
  onConfirm,
  onCancel,
}: {
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 p-6 animate-fade-up">
        <button onClick={onCancel} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X size={16} />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className={cn("text-sm font-semibold", portalHeading)}>Xóa tài liệu?</p>
            <p className={cn("text-xs mt-0.5", portalSubtext)}>Hành động này không thể hoàn tác.</p>
          </div>
        </div>
        <p className={cn("text-xs px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-medium truncate", portalHeading)}>
          {fileName}
        </p>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Hủy
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center gap-2">
            <Trash2 size={13} />
            Xóa
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function KnowledgePageContent({
  onFetchDocs,
  onUpload,
  onDelete,
  onReingest,
  onRefreshDoc,
}: KnowledgePageContentProps) {
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reingestingId, setReingestingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<KnowledgeDocument | null>(null);
  const [search, setSearch] = useState("");

  // Poll processing documents every 5s
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDocs = useCallback(async () => {
    const result = await onFetchDocs();
    setDocs(result);
    setLoading(false);
  }, [onFetchDocs]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  useEffect(() => {
    const hasProcessing = docs.some(
      (d) => d.status === "INGESTING" || d.status === "PROCESSING" || d.status === "PENDING"
    );
    if (hasProcessing && onRefreshDoc) {
      pollRef.current = setInterval(async () => {
        const processing = docs.filter(
          (d) => d.status === "INGESTING" || d.status === "PROCESSING" || d.status === "PENDING"
        );
        const updated = await Promise.all(processing.map((d) => onRefreshDoc(d.id)));
        setDocs((prev) =>
          prev.map((d) => {
            const refreshed = updated.find((u) => u?.id === d.id);
            return refreshed ?? d;
          })
        );
      }, 5000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [docs, onRefreshDoc]);

  async function handleFiles(files: File[]) {
    const tooBig = files.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig) {
      setUploadError(`File "${tooBig.name}" vượt quá ${MAX_FILE_MB} MB.`);
      return;
    }
    setUploadError(null);
    for (const file of files) {
      setUploading(true);
      setUploadingFileName(file.name);
      const result = await onUpload(file);
      if (result) {
        setDocs((prev) => [result, ...prev]);
      } else {
        setUploadError(`Không thể tải lên "${file.name}". Vui lòng thử lại.`);
      }
      setUploading(false);
      setUploadingFileName("");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const ok = await onDelete(id);
    if (ok) setDocs((prev) => prev.filter((d) => d.id !== id));
    setDeletingId(null);
    setConfirmDelete(null);
  }

  async function handleReingest(id: string) {
    setReingestingId(id);
    const ok = await onReingest(id);
    if (ok) {
      setDocs((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: "INGESTING" as const } : d))
      );
    }
    setReingestingId(null);
  }

  const filtered = docs.filter((d) =>
    !search || d.fileName.toLowerCase().includes(search.toLowerCase())
  );

  const readyCount = docs.filter((d) => d.status === "READY").length;
  const processingCount = docs.filter(
    (d) => d.status === "INGESTING" || d.status === "PROCESSING" || d.status === "PENDING"
  ).length;
  const failedCount = docs.filter((d) => d.status === "FAILED").length;

  return (
    <>
      {confirmDelete && (
        <DeleteModal
          fileName={confirmDelete.fileName}
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* ── Left panel: Sources ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Sẵn sàng", value: readyCount, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
              { label: "Xử lý", value: processingCount, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
              { label: "Lỗi", value: failedCount, color: "text-red-500 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={cn("rounded-xl p-3 text-center", bg)}>
                <p className={cn("text-xl font-bold", color)}>{value}</p>
                <p className={cn("text-[11px] font-medium mt-0.5", portalSubtext)}>{label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm tài liệu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "w-full pl-9 pr-4 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-violet-400/30",
                portalInput
              )}
            />
          </div>

          {/* Document list */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-340px)]">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={22} className="text-violet-500 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <BookOpen size={28} className="text-gray-300 dark:text-gray-600" />
                <p className={cn("text-sm", portalSubtext)}>
                  {search ? "Không tìm thấy tài liệu." : "Chưa có tài liệu nào."}
                </p>
              </div>
            ) : (
              filtered.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onDelete={(id) => {
                    const d = docs.find((x) => x.id === id);
                    if (d) setConfirmDelete(d);
                  }}
                  onReingest={handleReingest}
                  deleting={deletingId === doc.id}
                  reingesting={reingestingId === doc.id}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right panel: Upload + Info ─────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Upload area */}
          <div className="hr-glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <FilePlus2 size={18} className="text-violet-500" />
              <h3 className={cn("text-sm font-semibold", portalHeading)}>Thêm tài liệu</h3>
            </div>

            {uploadError && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                {uploadError}
              </div>
            )}

            <UploadZone
              onFiles={handleFiles}
              uploading={uploading}
              uploadingFileName={uploadingFileName}
            />
          </div>

          {/* How it works */}
          <div className="hr-glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={18} className="text-violet-500" />
              <h3 className={cn("text-sm font-semibold", portalHeading)}>Cách hoạt động</h3>
            </div>
            <ol className="space-y-3">
              {[
                { n: 1, title: "Upload tài liệu", desc: "Tải lên JD, tài liệu kỹ thuật, hoặc tài liệu nội bộ định dạng PDF/DOCX." },
                { n: 2, title: "Hệ thống xử lý", desc: "AI sẽ phân tích và lập chỉ mục nội dung tài liệu để dùng làm nguồn RAG." },
                { n: 3, title: "Tạo câu hỏi thông minh", desc: "Khi generate câu hỏi, AI sẽ tham chiếu tài liệu để tạo câu hỏi chính xác và phù hợp hơn." },
              ].map(({ n, title, desc }) => (
                <li key={n} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {n}
                  </span>
                  <div>
                    <p className={cn("text-sm font-medium", portalHeading)}>{title}</p>
                    <p className={cn("text-xs mt-0.5", portalSubtext)}>{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Supported formats */}
          <div className={cn("rounded-xl border px-4 py-3 flex flex-wrap gap-2 items-center", "border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40")}>
            <span className={cn("text-xs font-medium", portalSubtext)}>Định dạng hỗ trợ:</span>
            {["PDF", "DOCX", "DOC", "TXT"].map((f) => (
              <span key={f} className="text-xs font-semibold px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                {f}
              </span>
            ))}
            <span className={cn("text-xs ml-auto", portalSubtext)}>Tối đa {MAX_FILE_MB} MB</span>
          </div>
        </div>
      </div>
    </>
  );
}
