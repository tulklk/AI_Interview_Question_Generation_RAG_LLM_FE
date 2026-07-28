"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, FileImage, FileText, FolderOpen, Loader2, Upload } from "lucide-react";
import type { AnalyzeJobDescriptionResponse, StudioDocument, StudioLibraryDocument } from "@/features/studio/types/studio.types";
import * as studioApi from "@/features/studio/services/studio.service";
import { cn } from "@/lib/cn";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

interface Props {
  jdContent: string;
  onJdChange: (value: string) => void;
  onSaveJd: () => Promise<void> | void;
  onUploadJd: (file: File) => Promise<void> | void;
  /** Tên file JD đã upload — null nếu paste text */
  jdFileName?: string | null;
  summary: AnalyzeJobDescriptionResponse | null;
  documents: StudioDocument[];
  onUploadDocument: (file: File) => Promise<void> | void;
  /** SCRUM-373: gắn từ Knowledge Documents đã upload */
  onAttachFromLibrary?: (knowledgeDocumentIds: string[]) => Promise<void> | void;
  onToggleDocument: (documentId: string, isSelected: boolean) => Promise<void> | void;
  projectId?: string;
  /** Khóa chỉnh sửa khi đang/đã generate câu hỏi */
  locked?: boolean;
}

type JdMode = "paste" | "upload";
type JdFileKind = "pdf" | "docx" | "doc" | "txt" | "image" | "unknown";

const JD_ACCEPT = ".pdf,.docx,.txt,.jpg,.jpeg,.png";

function getJdFileKind(fileName: string): JdFileKind {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "doc") return "doc";
  if (ext === "txt") return "txt";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
  return "unknown";
}

const JD_FILE_STYLE: Record<JdFileKind, { bg: string; accent: string; label: string }> = {
  pdf: { bg: "bg-red-50 dark:bg-red-950/40", accent: "text-red-500", label: "PDF" },
  docx: { bg: "bg-blue-50 dark:bg-blue-950/40", accent: "text-blue-500", label: "DOCX" },
  doc: { bg: "bg-sky-50 dark:bg-sky-950/40", accent: "text-sky-500", label: "DOC" },
  txt: { bg: "bg-gray-100 dark:bg-gray-800", accent: "text-gray-500", label: "TXT" },
  image: { bg: "bg-emerald-50 dark:bg-emerald-950/40", accent: "text-emerald-500", label: "IMG" },
  unknown: { bg: "bg-violet-50 dark:bg-violet-950/40", accent: "text-violet-500", label: "FILE" },
};

function JdFileIcon({ fileName }: { fileName: string }) {
  const kind = getJdFileKind(fileName);
  const { bg, accent, label } = JD_FILE_STYLE[kind];
  const Icon = kind === "image" ? FileImage : FileText;

  return (
    <div className={cn("relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", bg)}>
      <Icon size={20} className={accent} />
      <span
        className={cn(
          "absolute -bottom-1 left-1/2 -translate-x-1/2 rounded px-1 text-[8px] font-bold uppercase tracking-wide text-white",
          kind === "pdf" && "bg-red-500",
          kind === "docx" && "bg-blue-500",
          kind === "doc" && "bg-sky-500",
          kind === "txt" && "bg-gray-500",
          kind === "image" && "bg-emerald-500",
          kind === "unknown" && "bg-violet-500"
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function SourcesPanel({
  jdContent,
  onJdChange,
  onSaveJd,
  onUploadJd,
  jdFileName = null,
  summary,
  documents,
  onUploadDocument,
  onAttachFromLibrary,
  onToggleDocument,
  projectId,
  locked = false,
}: Props) {
  const [jdMode, setJdMode] = useState<JdMode>(jdFileName ? "upload" : "paste");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryDocs, setLibraryDocs] = useState<StudioLibraryDocument[]>([]);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [attaching, setAttaching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync tab Upload khi bootstrap/reload đã có file JD
  useEffect(() => {
    if (jdFileName) setJdMode("upload");
  }, [jdFileName]);

  const counts = useMemo(() => {
    const words = jdContent.trim() ? jdContent.trim().split(/\s+/).length : 0;
    return { words, chars: jdContent.length };
  }, [jdContent]);

  const loadLibrary = useCallback(async () => {
    if (!projectId) return;
    setLibraryLoading(true);
    try {
      const list = await studioApi.listLibraryDocuments(projectId);
      setLibraryDocs(list);
      setPickedIds(new Set());
    } finally {
      setLibraryLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!libraryOpen) return;
    void loadLibrary();
  }, [libraryOpen, loadLibrary]);

  async function handleJdFile(file: File | undefined | null) {
    if (!file) return;
    setUploading(true);
    try {
      await onUploadJd(file);
      // Giữ tab Upload để hiện icon + tên file
      setJdMode("upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function togglePick(id: string, alreadyAttached: boolean, status: string) {
    if (alreadyAttached) return;
    if (status.toUpperCase() !== "COMPLETED") return;
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAttach() {
    if (!onAttachFromLibrary || pickedIds.size === 0) return;
    setAttaching(true);
    try {
      await onAttachFromLibrary([...pickedIds]);
      setLibraryOpen(false);
      setPickedIds(new Set());
    } finally {
      setAttaching(false);
    }
  }

  const attachableCount = libraryDocs.filter(
    (d) => !d.alreadyAttached && d.status.toUpperCase() === "COMPLETED"
  ).length;

  return (
    <div className={cn(portalCard, "relative p-4 space-y-4", locked && "opacity-60")}>
      {locked && (
        <div
          className="absolute inset-0 z-10 cursor-not-allowed rounded-xl bg-gray-200/40 dark:bg-gray-950/50"
          title="Đã khóa — bấm Tạo bộ mới để chỉnh Sources"
          aria-hidden
        />
      )}
      <fieldset disabled={locked} className="min-w-0 space-y-4 border-0 p-0">
      <h3 className={cn("text-sm font-semibold", portalHeading)}>SOURCES</h3>

      <div className="space-y-2">
        <div className="flex flex-nowrap items-center justify-between gap-1.5">
          <label className={cn("shrink-0 text-[11px] font-semibold leading-none whitespace-nowrap", portalHeading)}>
            Job Description
          </label>
          <div className="flex shrink-0 rounded-md border border-gray-200 p-0.5 text-[10px] dark:border-gray-700">
            <button
              type="button"
              onClick={() => setJdMode("paste")}
              className={cn(
                "whitespace-nowrap rounded px-1.5 py-0.5",
                jdMode === "paste" ? "bg-[#6c47ff] text-white" : "text-gray-600 dark:text-gray-300"
              )}
            >
              Paste JD
            </button>
            <button
              type="button"
              onClick={() => setJdMode("upload")}
              className={cn(
                "whitespace-nowrap rounded px-1.5 py-0.5",
                jdMode === "upload" ? "bg-[#6c47ff] text-white" : "text-gray-600 dark:text-gray-300"
              )}
            >
              Upload file
            </button>
          </div>
        </div>
        {jdMode === "paste" ? (
          <>
            <textarea
              value={jdContent}
              onChange={(e) => onJdChange(e.target.value)}
              placeholder="Paste JD here..."
              rows={4}
              className="w-full resize-y rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs leading-relaxed dark:border-gray-700 dark:bg-gray-900 min-h-[88px] max-h-[160px]"
            />
            <div className="flex items-center justify-between gap-2">
              <p className={cn("text-[10px]", portalSubtext)}>
                {counts.words} words • {counts.chars} characters
              </p>
              <button onClick={() => onSaveJd()} type="button" className="shrink-0 rounded-md bg-[#6c47ff] px-2.5 py-1 text-[10px] text-white">
                Save & Analyze
              </button>
            </div>
          </>
        ) : jdFileName && !uploading ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-lg border border-[#6c47ff]/30 bg-[#6c47ff]/5 px-3 py-3 dark:border-[#6c47ff]/40 dark:bg-[#6c47ff]/10">
              <JdFileIcon fileName={jdFileName} />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm font-medium", portalHeading)} title={jdFileName}>
                  {jdFileName}
                </p>
                <p className={cn("text-[11px]", portalSubtext)}>
                  Đã upload & phân tích • {counts.words} words
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:border-[#6c47ff]/50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                title="Chọn file khác"
              >
                Thay file
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept={JD_ACCEPT}
              onChange={(e) => void handleJdFile(e.target.files?.[0])}
            />
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void handleJdFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "rounded-lg border border-dashed px-3 py-2 text-center text-[11px] transition-colors",
                dragging
                  ? "border-[#6c47ff] bg-[#6c47ff]/5 text-[#6c47ff]"
                  : "border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400"
              )}
            >
              Hoặc kéo thả file mới để thay thế
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void handleJdFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
              dragging
                ? "border-[#6c47ff] bg-[#6c47ff]/5"
                : "border-gray-300 hover:border-[#6c47ff]/60 dark:border-gray-700"
            )}
          >
            {uploading ? (
              <Loader2 size={22} className="animate-spin text-[#6c47ff]" />
            ) : (
              <FileText size={22} className="text-[#6c47ff]" />
            )}
            <p className={cn("text-sm font-medium", portalHeading)}>
              {uploading ? "Đang upload & phân tích..." : "Kéo thả hoặc chọn file JD"}
            </p>
            <p className={cn("text-xs", portalSubtext)}>PDF, DOCX, TXT, JPG, PNG • tối đa 20 MB</p>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept={JD_ACCEPT}
              onChange={(e) => void handleJdFile(e.target.files?.[0])}
            />
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <p className={cn("text-xs font-semibold", portalHeading)}>Auto-detected summary</p>
        <p className={cn("text-xs", portalSubtext)}>Role: {summary?.detectedRole ?? "-"}</p>
        <p className={cn("text-xs", portalSubtext)}>Seniority: {summary?.detectedSeniority ?? "-"}</p>
        <p className={cn("text-xs", portalSubtext)}>Language: {summary?.detectedLanguage ?? "-"}</p>
        <div className="flex flex-wrap gap-1.5">
          {(summary?.skills ?? []).map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <p className={cn("text-xs font-semibold", portalHeading)}>Knowledge documents ({documents.length})</p>
          <div className="flex items-center gap-1">
            {onAttachFromLibrary && projectId ? (
              <button
                type="button"
                onClick={() => setLibraryOpen((v) => !v)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-600"
                title="Chọn từ tài liệu đã upload ở Knowledge Documents"
              >
                <FolderOpen size={12} />
                Từ thư viện
              </button>
            ) : null}
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-600">
              <Upload size={12} />
              Add document
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onUploadDocument(file);
                }}
              />
            </label>
          </div>
        </div>
        {/* SCRUM-373: picker gắn từ KB */}
        {libraryOpen && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/60">
              <p className={cn("text-xs font-semibold", portalHeading)}>Chọn từ Knowledge Documents</p>
              <Link
                href="/hr/knowledge/"
                target="_blank"
                className="text-[11px] text-[#6c47ff] hover:underline"
              >
                Quản lý KB
              </Link>
            </div>
            {libraryLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={18} className="animate-spin text-[#6c47ff]" />
              </div>
            ) : libraryDocs.length === 0 ? (
              <div className="px-3 py-4 text-center space-y-2">
                <p className={cn("text-xs", portalSubtext)}>Chưa có tài liệu trong Knowledge Base.</p>
                <Link
                  href="/hr/knowledge/"
                  className="inline-flex text-xs font-medium text-[#6c47ff] hover:underline"
                >
                  Upload tại Knowledge Documents
                </Link>
              </div>
            ) : (
              <ul className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                {libraryDocs.map((doc) => {
                  const ready = doc.status.toUpperCase() === "COMPLETED";
                  const disabled = doc.alreadyAttached || !ready;
                  const picked = pickedIds.has(doc.knowledgeDocumentId);
                  return (
                    <li key={doc.knowledgeDocumentId}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => togglePick(doc.knowledgeDocumentId, doc.alreadyAttached, doc.status)}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                          disabled
                            ? "opacity-50 cursor-not-allowed"
                            : picked
                              ? "bg-[rgba(108,71,255,0.08)]"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                        )}
                      >
                        <FileText size={14} className="shrink-0 text-blue-500" />
                        <span className={cn("flex-1 min-w-0 truncate font-medium", portalHeading)} title={doc.fileName}>
                          {doc.fileName}
                        </span>
                        <span className={cn("shrink-0 text-[10px]", portalSubtext)}>
                          {doc.alreadyAttached
                            ? "Đã gắn"
                            : ready
                              ? `${doc.chunkCount ?? 0} chunks`
                              : doc.status}
                        </span>
                        {picked ? <Check size={12} className="shrink-0 text-[#6c47ff]" strokeWidth={3} /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-100 dark:border-gray-800">
              <p className={cn("text-[11px]", portalSubtext)}>
                {attachableCount === 0
                  ? "Không còn doc Completed để gắn"
                  : `Đã chọn ${pickedIds.size} / ${attachableCount} sẵn sàng`}
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setLibraryOpen(false)}
                  className="rounded-md px-2 py-1 text-xs text-gray-600 dark:text-gray-300"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={pickedIds.size === 0 || attaching || !onAttachFromLibrary}
                  onClick={() => void handleAttach()}
                  className="rounded-md bg-[#6c47ff] px-2.5 py-1 text-xs text-white disabled:opacity-40"
                >
                  {attaching ? "Đang gắn…" : "Gắn vào Sources"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {documents.map((doc) => {
            const ragReady = doc.status === "Completed";
            const statusLabel = doc.ragStatus ?? doc.status;
            const chunkLabel = typeof doc.chunkCount === "number" ? ` • ${doc.chunkCount} chunks` : "";
            return (
              <label key={doc.id} className="flex items-start gap-2 rounded-md border border-gray-200 p-2 text-xs dark:border-gray-700">
                <input
                  type="checkbox"
                  checked={doc.isSelected}
                  disabled={!ragReady && !doc.isSelected}
                  onChange={(e) => void onToggleDocument(doc.id, e.target.checked)}
                  className="mt-0.5"
                  title={ragReady ? "Dùng source này cho plan/câu hỏi" : "Chờ RAG ingest xong mới chọn được"}
                />
                <div className="min-w-0">
                  <p className={cn("truncate font-medium", portalHeading)}>
                    {doc.fileName}
                    {doc.isLibraryLink ? (
                      <span className="ml-1 font-normal text-[10px] text-[#6c47ff]">(thư viện)</span>
                    ) : null}
                  </p>
                  <p className={cn("text-[11px]", portalSubtext)}>
                    {doc.fileSize > 0 ? `${(doc.fileSize / 1024).toFixed(0)} KB • ` : ""}
                    RAG: {statusLabel}
                    {chunkLabel}
                  </p>
                  {doc.processingError ? (
                    <p className="mt-0.5 text-[11px] text-red-600 dark:text-red-400">{doc.processingError}</p>
                  ) : null}
                </div>
              </label>
            );
          })}
        </div>
      </div>
      </fieldset>
    </div>
  );
}
