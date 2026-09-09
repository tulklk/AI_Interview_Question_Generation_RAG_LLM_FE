"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
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
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext, portalInput } from "@/shared/utils/portal-ui";
import { useCountUp } from "@/shared/hooks/use-count-up";
import { useInView } from "framer-motion";
import type { KnowledgeDocument, DocumentStatus, KnowledgeDocumentType, KnowledgeChunkPreview } from "@/features/knowledge/types/knowledge";
import { HR_DOCUMENT_TYPES } from "@/features/knowledge/types/knowledge";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { extractErrorMessage } from "@/core/interceptors/error.interceptor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KnowledgePageContentProps {
  variant: "hr" | "admin";
  onFetchDocs: () => Promise<KnowledgeDocument[]>;
  /** SCRUM-442: HR truyền documentType; Admin bỏ qua. */
  onUpload: (file: File, documentType?: KnowledgeDocumentType) => Promise<KnowledgeDocument | null>;
  onDelete: (id: string) => Promise<boolean>;
  onReingest: (id: string) => Promise<boolean>;
  onRefreshDoc?: (id: string) => Promise<KnowledgeDocument | null>;
  onUpdateType?: (id: string, documentType: KnowledgeDocumentType) => Promise<KnowledgeDocument | null>;
  onFetchChunks?: (id: string) => Promise<KnowledgeChunkPreview[]>;
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

function DocStatTile({ value, label, color, bg }: { value: number; label: string; color: string; bg: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const display = useCountUp(value, isInView);
  return (
    <div ref={ref} className={cn("rounded-xl p-3 text-center", bg)}>
      <p className={cn("text-xl font-bold tabular-nums", color)}>{display}</p>
      <p className={cn("text-[11px] font-medium mt-0.5", portalSubtext)}>{label}</p>
    </div>
  );
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Chuẩn hóa text chunk để preview dễ đọc — không đổi dữ liệu lưu DB. */
function formatChunkForDisplay(raw: string): string {
  let t = (raw ?? "").replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ").trim();
  if (!t) return "";

  if (t.includes("\n")) {
    return t
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");
  }

  // PDF/DOCX thường 1 dòng: tách heading "1. Title" và ngắt câu
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/\s+(\d+\.\s+[A-ZÀ-Ỹ])/g, "\n\n$1");
  t = t.replace(/([.!?…])\s+(?=[A-ZÀ-Ỹ0-9“"'])/g, "$1\n");
  return t.replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n").trim();
}

function ChunkPreviewCard({
  chunk,
  total,
}: {
  chunk: KnowledgeChunkPreview;
  total: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const formatted = formatChunkForDisplay(chunk.content);
  const lines = formatted.split("\n").filter((l) => l.trim().length > 0);
  const isLong = formatted.length > 420 || lines.length > 8;
  const previewLines = expanded || !isLong ? lines : lines.slice(0, 6);

  return (
    <li className="rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/80 dark:bg-gray-950/50 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-950/60 px-1.5 tabular-nums">
            #{chunk.chunkIndex}
          </span>
          <span className={cn("font-medium", portalSubtext)}>
            {chunk.chunkIndex + 1}/{total}
          </span>
        </span>
        <span className={cn("text-[10px] tabular-nums", portalSubtext)}>
          {chunk.content.length.toLocaleString()} ký tự
        </span>
      </div>
      <div className="px-3 py-2.5 space-y-1.5">
        {previewLines.map((line, i) => {
          const isHeading = /^\d+\.\s+\S/.test(line.trim());
          return (
            <p
              key={`${chunk.chunkId}-${i}`}
              className={cn(
                "text-[12px] leading-relaxed break-words",
                isHeading
                  ? cn("font-semibold pt-1 first:pt-0", portalHeading)
                  : portalSubtext
              )}
            >
              {line}
            </p>
          );
        })}
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline"
          >
            {expanded ? "Thu gọn" : "Xem thêm"}
          </button>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// File type icon
// ---------------------------------------------------------------------------

type FileType = "pdf" | "docx" | "doc" | "txt" | "unknown";

function getFileType(fileName: string, mimeType?: string): FileType {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  const mime = (mimeType ?? "").toLowerCase();
  if (ext === "pdf" || mime.includes("pdf")) return "pdf";
  if (ext === "docx" || mime.includes("openxmlformats")) return "docx";
  if (ext === "doc" || mime.includes("msword")) return "doc";
  if (ext === "txt" || mime.includes("plain")) return "txt";
  return "unknown";
}

const FILE_TYPE_CONFIG: Record<FileType, { bg: string; accent: string; label: string }> = {
  pdf:     { bg: "bg-red-50 dark:bg-red-950/40",       accent: "#ef4444", label: "PDF"  },
  docx:    { bg: "bg-blue-50 dark:bg-blue-950/40",     accent: "#3b82f6", label: "DOCX" },
  doc:     { bg: "bg-sky-50 dark:bg-sky-950/40",       accent: "#0ea5e9", label: "DOC"  },
  txt:     { bg: "bg-gray-100 dark:bg-gray-800",       accent: "#6b7280", label: "TXT"  },
  unknown: { bg: "bg-violet-50 dark:bg-violet-950/40", accent: "#7c3aed", label: "FILE" },
};

function FileTypeIcon({ fileName, mimeType }: { fileName: string; mimeType?: string }) {
  const type = getFileType(fileName, mimeType);
  const { bg, accent, label } = FILE_TYPE_CONFIG[type];
  const small = label.length > 3;

  return (
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", bg)}>
      <svg width="24" height="28" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Document body */}
        <rect x="1" y="0.5" width="22" height="27" rx="2" fill="white" stroke={accent} strokeWidth="0.7" strokeOpacity="0.2"/>
        {/* Folded corner */}
        <path d="M15.5 0.5 L22.5 7.5 H16 C15.7 7.5 15.5 7.3 15.5 7 V0.5Z" fill={accent} fillOpacity="0.18"/>
        <path d="M15.5 0.5 L15.5 7 C15.5 7.3 15.7 7.5 16 7.5 L22.5 7.5" stroke={accent} strokeWidth="0.7" strokeOpacity="0.2" fill="none"/>
        {/* Content lines */}
        <line x1="3.5" y1="11" x2="15" y2="11" stroke={accent} strokeOpacity="0.28" strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="3.5" y1="14" x2="11" y2="14" stroke={accent} strokeOpacity="0.28" strokeWidth="1.3" strokeLinecap="round"/>
        {/* Footer strip */}
        <path d="M1 19.5 H23 V26 C23 27.1 22.1 27.5 21 27.5 H3 C1.9 27.5 1 27.1 1 26 V19.5Z" fill={accent}/>
        {/* Extension label */}
        <text
          x="12"
          y="25.5"
          textAnchor="middle"
          fill="white"
          fontSize={small ? "4.8" : "6"}
          fontWeight="800"
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          letterSpacing="0.3"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: DocumentStatus }) {
  const { t } = useLanguage();
  const kb = t.knowledgePage;

  const map: Record<DocumentStatus, { label: string; className: string; icon: React.ReactNode }> = {
    READY: {
      label: kb.statusReady,
      className: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      icon: <CheckCircle2 size={11} />,
    },
    INGESTING: {
      label: kb.statusIngesting,
      className: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      icon: <Loader2 size={11} className="animate-spin" />,
    },
    PROCESSING: {
      label: kb.statusProcessing,
      className: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      icon: <Loader2 size={11} className="animate-spin" />,
    },
    PENDING: {
      label: kb.statusPending,
      className: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      icon: <Loader2 size={11} className="animate-spin" />,
    },
    FAILED: {
      label: kb.statusFailed,
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
// Document row
// ---------------------------------------------------------------------------

function DocumentCard({
  doc,
  onDelete,
  onReingest,
  onOpen,
  deleting,
  reingesting,
}: {
  doc: KnowledgeDocument;
  onDelete: (id: string) => void;
  onReingest: (id: string) => void;
  onOpen?: (doc: KnowledgeDocument) => void;
  deleting: boolean;
  reingesting: boolean;
}) {
  const { t } = useLanguage();
  const kb = t.knowledgePage;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const isProcessing = doc.status === "INGESTING" || doc.status === "PROCESSING" || doc.status === "PENDING";
  const typeLabel = (kb.documentTypes as Record<string, string> | undefined)?.[doc.documentType ?? "Unclassified"]
    ?? doc.documentType
    ?? "Unclassified";

  // Close on outside click or scroll
  useEffect(() => {
    if (!menuOpen) return;
    function close(e: MouseEvent) {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        btnRef.current  && !btnRef.current.contains(e.target as Node)
      ) setMenuOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", () => setMenuOpen(false), true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("scroll", () => setMenuOpen(false), true);
    };
  }, [menuOpen]);

  function openMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (menuOpen) { setMenuOpen(false); return; }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setMenuOpen(true);
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return kb.today;
    if (diff === 1) return kb.yesterday;
    if (diff < 7) return kb.daysAgo.replace("{{n}}", String(diff));
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  return (
    <div
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={() => onOpen?.(doc)}
      onKeyDown={(e) => { if (onOpen && (e.key === "Enter" || e.key === " ")) onOpen(doc); }}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
        "hover:bg-gray-50 dark:hover:bg-gray-800/60",
        onOpen && "cursor-pointer",
      )}
    >
      <FileTypeIcon fileName={doc.fileName} mimeType={doc.mimeType} />

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium leading-snug truncate", portalHeading)} title={doc.fileName}>
          {doc.fileName}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <StatusBadge status={doc.status} />
          <span className="inline-flex items-center rounded-full bg-violet-50 dark:bg-violet-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
            {typeLabel}
          </span>
          {typeof doc.studioProjectCount === "number" && doc.studioProjectCount > 0 && (
            <span className={cn("text-[11px]", portalSubtext)}>
              {(kb.inProjects ?? "{{n}} project").replace("{{n}}", String(doc.studioProjectCount))}
            </span>
          )}
          {typeof doc.citationCount === "number" && doc.citationCount > 0 && (
            <span className={cn("text-[11px]", portalSubtext)}>
              {(kb.citedTimes ?? "{{n}} cite").replace("{{n}}", String(doc.citationCount))}
            </span>
          )}
          {doc.fileSize && (
            <span className={cn("text-[11px]", portalSubtext)}>{formatBytes(doc.fileSize)}</span>
          )}
          <span className={cn("text-[11px]", portalSubtext)}>{formatDate(doc.createdAt)}</span>
        </div>
        {doc.status === "FAILED" && doc.errorMessage && (
          <p className="text-[11px] text-red-500 dark:text-red-400 mt-1 line-clamp-1">
            {doc.errorMessage}
          </p>
        )}
      </div>

      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        className={cn(
          "shrink-0 p-1.5 rounded-lg transition-all",
          "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200",
          "hover:bg-gray-100 dark:hover:bg-gray-700",
          menuOpen
            ? "opacity-100 bg-gray-100 dark:bg-gray-700"
            : "opacity-0 group-hover:opacity-100"
        )}
      >
        {(deleting || reingesting)
          ? <Loader2 size={14} className="animate-spin" />
          : <MoreHorizontal size={14} />
        }
      </button>

      {menuOpen && createPortal(
        <div
          ref={dropRef}
          // Portal bubble theo React tree → phải chặn kẻo mở luôn drawer (onOpen của card).
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="w-48 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl py-1 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {(doc.status === "FAILED" || isProcessing) && (
            <button
              type="button"
              disabled={reingesting}
              onClick={(e) => {
                e.stopPropagation();
                onReingest(doc.id);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <RotateCcw size={13} className="text-gray-400" />
              {doc.status === "FAILED" ? kb.reingestTitle : kb.retryTitle}
            </button>
          )}
          <button
            type="button"
            disabled={deleting}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(doc.id);
              setMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
          >
            <Trash2 size={13} className="text-red-400" />
            Xoá nguồn
          </button>
        </div>,
        document.body
      )}
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
  const { t } = useLanguage();
  const kb = t.knowledgePage;
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
          <p className={cn("text-sm font-semibold", portalHeading)}>{kb.uploadingLabel}</p>
          <p className={cn("text-xs truncate max-w-65", portalSubtext)}>{uploadingFileName}</p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className={cn("text-sm font-semibold", portalHeading)}>{kb.dragDropLabel}</p>
          <p className={cn("text-xs", portalSubtext)}>
            {kb.dragDropOr}{" "}
            <span className="text-violet-600 dark:text-violet-400 font-medium">{kb.dragDropClick}</span>
          </p>
          <p className={cn("text-[11px] mt-1", portalSubtext)}>
            {kb.dragDropHint.replace("{{n}}", String(MAX_FILE_MB))}
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
  const { t } = useLanguage();
  const kb = t.knowledgePage;

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
            <p className={cn("text-sm font-semibold", portalHeading)}>{kb.deleteTitle}</p>
            <p className={cn("text-xs mt-0.5", portalSubtext)}>{kb.deleteDesc}</p>
          </div>
        </div>
        <p className={cn("text-xs px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-medium truncate", portalHeading)}>
          {fileName}
        </p>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            {kb.deleteCancel}
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center gap-2">
            <Trash2 size={13} />
            {kb.deleteConfirm}
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
  variant,
  onFetchDocs,
  onUpload,
  onDelete,
  onReingest,
  onRefreshDoc,
  onUpdateType,
  onFetchChunks,
}: KnowledgePageContentProps) {
  const { t, lang } = useLanguage();
  const kb = t.knowledgePage;
  const { addToast } = useToast();

  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reingestingId, setReingestingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<KnowledgeDocument | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [uploadType, setUploadType] = useState<KnowledgeDocumentType>("InternalStack");
  const [drawerDoc, setDrawerDoc] = useState<KnowledgeDocument | null>(null);
  const [drawerChunks, setDrawerChunks] = useState<KnowledgeChunkPreview[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDocs = useCallback(async () => {
    try {
      const result = await onFetchDocs();
      setDocs(result);
    } catch (error) {
      setDocs([]);
      addToast(
        "error",
        extractErrorMessage(error, lang === "vi" ? "vi" : "en") ||
          (lang === "vi" ? "Không tải được danh sách tài liệu." : "Failed to load documents.")
      );
    } finally {
      setLoading(false);
    }
  }, [onFetchDocs, addToast, lang]);

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
      addToast("error", kb.fileTooLarge.replace("{{name}}", tooBig.name).replace("{{n}}", String(MAX_FILE_MB)));
      return;
    }
    if (variant === "hr" && !uploadType) {
      addToast("error", kb.typeRequired ?? "Chọn loại tài liệu trước khi upload.");
      return;
    }
    for (const file of files) {
      setUploading(true);
      setUploadingFileName(file.name);
      try {
        const result = await onUpload(file, variant === "hr" ? uploadType : undefined);
        if (result) {
          setDocs((prev) => [result, ...prev.filter((d) => d.id !== result.id)]);
          addToast("success", kb.uploadSuccess.replace("{{name}}", file.name));
          // Đồng bộ lại từ server (status/chunkCount đầy đủ).
          void loadDocs();
        } else {
          addToast("error", kb.uploadFailed.replace("{{name}}", file.name));
        }
      } catch (error) {
        addToast(
          "error",
          extractErrorMessage(error, lang === "vi" ? "vi" : "en") ||
            kb.uploadFailed.replace("{{name}}", file.name)
        );
      }
      setUploading(false);
      setUploadingFileName("");
    }
  }

  async function openDrawer(doc: KnowledgeDocument) {
    setDrawerDoc(doc);
    setDrawerChunks([]);
    if (!onFetchChunks) return;
    setDrawerLoading(true);
    try {
      const chunks = await onFetchChunks(doc.id);
      setDrawerChunks(chunks);
    } catch (error) {
      setDrawerChunks([]);
      addToast(
        "error",
        extractErrorMessage(error, lang === "vi" ? "vi" : "en") ||
          (lang === "vi" ? "Không tải được preview chunk." : "Failed to load chunk preview.")
      );
    } finally {
      setDrawerLoading(false);
    }
  }

  async function handleChangeType(id: string, documentType: KnowledgeDocumentType) {
    if (!onUpdateType) return;
    const updated = await onUpdateType(id, documentType);
    if (updated) {
      setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
      if (drawerDoc?.id === id) setDrawerDoc({ ...drawerDoc, ...updated });
      addToast("success", kb.typeUpdated ?? "Đã cập nhật loại tài liệu.");
    } else {
      addToast("error", kb.typeUpdateFailed ?? "Không thể đổi loại tài liệu.");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const ok = await onDelete(id);
    if (ok) {
      setDocs((prev) => prev.filter((d) => d.id !== id));
      if (drawerDoc?.id === id) {
        setDrawerDoc(null);
        setDrawerChunks([]);
      }
      addToast("success", kb.deleteSuccess);
    } else {
      addToast("error", kb.deleteFailed);
    }
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
      addToast("success", kb.reingestSuccess);
    } else {
      addToast("error", kb.reingestFailed);
    }
    setReingestingId(null);
  }

  const filtered = docs.filter((d) => {
    const matchSearch = !search || d.fileName.toLowerCase().includes(search.toLowerCase());
    const matchType =
      typeFilter === "all" ||
      (d.documentType ?? "Unclassified") === typeFilter;
    return matchSearch && matchType;
  });

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
            <DocStatTile value={readyCount} label={kb.statsReady} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/30" />
            <DocStatTile value={processingCount} label={kb.statsProcessing} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-950/30" />
            <DocStatTile value={failedCount} label={kb.statsFailed} color="text-red-500 dark:text-red-400" bg="bg-red-50 dark:bg-red-950/30" />
          </div>

          {/* Search + type filter */}
          <div className="space-y-2">
            <div className="relative">
              <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={kb.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  "w-full pl-9 pr-4 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-violet-400/30",
                  portalInput
                )}
              />
            </div>
            {variant === "hr" && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={cn("w-full px-3 py-2 text-sm rounded-xl border", portalInput)}
              >
                <option value="all">{kb.filterAllTypes ?? "Tất cả loại"}</option>
                {HR_DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {(kb.documentTypes as Record<string, string> | undefined)?.[t] ?? t}
                  </option>
                ))}
                <option value="Unclassified">
                  {(kb.documentTypes as Record<string, string> | undefined)?.Unclassified ?? "Chưa phân loại"}
                </option>
              </select>
            )}
          </div>

          {/* Document list */}
          <div className="flex flex-col overflow-y-auto max-h-[calc(100vh-340px)]">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={22} className="text-violet-500 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <BookOpen size={28} className="text-gray-300 dark:text-gray-600" />
                <p className={cn("text-sm", portalSubtext)}>
                  {search ? kb.emptySearch : kb.emptyList}
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
                    // Đóng drawer nếu đang xem đúng file sắp xóa — tránh chồng modal + detail.
                    if (drawerDoc?.id === id) {
                      setDrawerDoc(null);
                      setDrawerChunks([]);
                    }
                  }}
                  onReingest={handleReingest}
                  onOpen={openDrawer}
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
              <h3 className={cn("text-sm font-semibold", portalHeading)}>{kb.uploadSection}</h3>
            </div>

            {variant === "hr" && (
              <div className="mb-3 space-y-1.5">
                <label className={cn("text-xs font-medium", portalSubtext)}>
                  {kb.documentTypeLabel ?? "Loại tài liệu"}
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as KnowledgeDocumentType)}
                  className={cn("w-full px-3 py-2 text-sm rounded-xl border", portalInput)}
                >
                  {HR_DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {(kb.documentTypes as Record<string, string> | undefined)?.[t] ?? t}
                    </option>
                  ))}
                </select>
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
              <h3 className={cn("text-sm font-semibold", portalHeading)}>{kb.howItWorksTitle}</h3>
            </div>
            <ol className="space-y-3">
              {kb.howItWorks.map(({ title, desc }, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
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
            <span className={cn("text-xs font-medium", portalSubtext)}>{kb.supportedFormats}</span>
            {["PDF", "DOCX", "DOC", "TXT"].map((f) => (
              <span key={f} className="text-xs font-semibold px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                {f}
              </span>
            ))}
            <span className={cn("text-xs ml-auto", portalSubtext)}>
              {kb.maxSize.replace("{{n}}", String(MAX_FILE_MB))}
            </span>
          </div>
        </div>
      </div>

      {drawerDoc && createPortal(
        <div className="fixed inset-0 z-9999 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerDoc(null)} />
          <div className="relative h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 p-5 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <p className={cn("text-sm font-semibold truncate", portalHeading)}>{drawerDoc.fileName}</p>
                <p className={cn("text-xs mt-1", portalSubtext)}>
                  {(kb.documentTypes as Record<string, string> | undefined)?.[drawerDoc.documentType ?? "Unclassified"]
                    ?? drawerDoc.documentType}
                  {" · "}
                  {(kb.citedTimes ?? "{{n}} cite").replace("{{n}}", String(drawerDoc.citationCount ?? 0))}
                  {" · "}
                  {(kb.inProjects ?? "{{n}} project").replace("{{n}}", String(drawerDoc.studioProjectCount ?? 0))}
                </p>
              </div>
              <button type="button" onClick={() => setDrawerDoc(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            {variant === "hr" && onUpdateType && (
              <div className="mb-4 space-y-1.5">
                <label className={cn("text-xs font-medium", portalSubtext)}>
                  {kb.changeType ?? "Đổi loại"}
                </label>
                <select
                  value={drawerDoc.documentType && drawerDoc.documentType !== "Unclassified"
                    ? drawerDoc.documentType
                    : "InternalStack"}
                  onChange={(e) => handleChangeType(drawerDoc.id, e.target.value as KnowledgeDocumentType)}
                  className={cn("w-full px-3 py-2 text-sm rounded-xl border", portalInput)}
                >
                  {HR_DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {(kb.documentTypes as Record<string, string> | undefined)?.[t] ?? t}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <p className={cn("text-xs font-semibold mb-2", portalHeading)}>
              {kb.chunksPreview ?? "Xem trước chunk"}
              {drawerDoc.chunkCount != null ? ` (${drawerDoc.chunkCount})` : ""}
            </p>
            {drawerLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-violet-500" />
              </div>
            ) : drawerChunks.length === 0 ? (
              <p className={cn("text-xs", portalSubtext)}>{kb.noChunks ?? "Chưa có chunk hoặc chưa ingest xong."}</p>
            ) : (
              <ul className="space-y-3">
                {drawerChunks.map((c) => (
                  <ChunkPreviewCard
                    key={c.chunkId || String(c.chunkIndex)}
                    chunk={c}
                    total={drawerDoc.chunkCount ?? drawerChunks.length}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
