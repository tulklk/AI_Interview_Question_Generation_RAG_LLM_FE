"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Check,
  Clock,
  Copy,
  FileImage,
  FileText,
  FolderOpen,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import type { AnalyzeJobDescriptionResponse, StudioDocument, StudioLibraryDocument } from "@/features/studio/types/studio.types";
import * as studioApi from "@/features/studio/services/studio.service";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

interface Props {
  jdContent: string;
  onJdChange: (value: string) => void;
  onSaveJd: () => Promise<void> | void;
  onUploadJd: (file: File) => Promise<void> | void;
  jdFileName?: string | null;
  summary: AnalyzeJobDescriptionResponse | null;
  documents: StudioDocument[];
  onUploadDocument: (file: File) => Promise<void> | void;
  onAttachFromLibrary?: (knowledgeDocumentIds: string[]) => Promise<void> | void;
  onToggleDocument: (documentId: string, isSelected: boolean) => Promise<void> | void;
  projectId?: string;
  locked?: boolean;
  /** Khóa riêng phần JD khi Free hết lượt generate (cooldown) */
  jdLocked?: boolean;
  /** Tooltip khi khóa do quota */
  jdLockedTitle?: string;
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

const JD_FILE_STYLE: Record<JdFileKind, { bg: string; accent: string; label: string; badgeBg: string }> = {
  pdf:     { bg: "bg-red-50 dark:bg-red-950/40",     accent: "text-red-500",    label: "PDF",  badgeBg: "bg-red-500" },
  docx:    { bg: "bg-blue-50 dark:bg-blue-950/40",   accent: "text-blue-500",   label: "DOCX", badgeBg: "bg-blue-500" },
  doc:     { bg: "bg-sky-50 dark:bg-sky-950/40",     accent: "text-sky-500",    label: "DOC",  badgeBg: "bg-sky-500" },
  txt:     { bg: "bg-gray-100 dark:bg-gray-800",     accent: "text-gray-500",   label: "TXT",  badgeBg: "bg-gray-500" },
  image:   { bg: "bg-emerald-50 dark:bg-emerald-950/40", accent: "text-emerald-500", label: "IMG", badgeBg: "bg-emerald-500" },
  unknown: { bg: "bg-violet-50 dark:bg-violet-950/40", accent: "text-violet-500",  label: "FILE", badgeBg: "bg-violet-500" },
};

function JdFileIcon({ fileName }: { fileName: string }) {
  const kind = getJdFileKind(fileName);
  const { bg, accent, label, badgeBg } = JD_FILE_STYLE[kind];
  const Icon = kind === "image" ? FileImage : FileText;
  return (
    <div className={cn("relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", bg)}>
      <Icon size={20} className={accent} />
      <span className={cn("absolute -bottom-1 left-1/2 -translate-x-1/2 rounded px-1 text-[8px] font-bold uppercase tracking-wide text-white", badgeBg)}>
        {label}
      </span>
    </div>
  );
}

function RagStatusChip({ status }: { status: string }) {
  const { t } = useLanguage();
  const src = t.studioPage.sources;
  const s = status.toUpperCase();
  const { bg, text, label } = s === "COMPLETED"
    ? { bg: "bg-emerald-100 dark:bg-emerald-950/40", text: "text-emerald-800 dark:text-emerald-200", label: src.ragReady }
    : s === "PROCESSING" || s === "QUEUED" || s === "PENDING"
      ? { bg: "bg-amber-100 dark:bg-amber-950/40", text: "text-amber-800 dark:text-amber-200", label: s === "PROCESSING" ? src.ragProcessing : src.ragQueued }
      : s === "FAILED"
        ? { bg: "bg-red-100 dark:bg-red-950/40", text: "text-red-800 dark:text-red-200", label: src.ragFailed }
        : { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-300", label: status };
  return (
    <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold", bg, text)}>
      {s === "COMPLETED" && <Check className="mr-0.5 h-2.5 w-2.5" strokeWidth={3} />}
      {(s === "PROCESSING" || s === "QUEUED" || s === "PENDING") && <Loader2 className="mr-0.5 h-2.5 w-2.5 animate-spin" />}
      {s === "FAILED" && <X className="mr-0.5 h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

function SectionLabel({ text, required }: { text: string; required?: boolean }) {
  const { t } = useLanguage();
  const src = t.studioPage.sources;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{text}</span>
      {required !== undefined && (
        <span className={cn(
          "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
          required
            ? "bg-primary/10 text-primary"
            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        )}>
          {required ? src.required : src.optional}
        </span>
      )}
    </div>
  );
}

// ── Sample JD ─────────────────────────────────────────────────────────────────

const SAMPLE_JD = `Chúng tôi đang tìm kiếm một Fullstack Developer với 1–3 năm kinh nghiệm để xây dựng các ứng dụng web hoàn chỉnh từ frontend đến backend.

Trách nhiệm:
- Xây dựng RESTful API sử dụng ASP.NET Core hoặc Node.js.
- Phát triển giao diện người dùng sử dụng React.js hoặc Next.js.
- Thiết kế và làm việc với cơ sở dữ liệu PostgreSQL, SQL Server hoặc MySQL.
- Tích hợp xác thực, phân quyền và bảo mật hệ thống.
- Phối hợp với QA, UI/UX Designer và Product Team để phát triển tính năng.
- Debug các vấn đề trên frontend, backend và tầng cơ sở dữ liệu.

Yêu cầu:
- Có kinh nghiệm với C#, ASP.NET Core hoặc Node.js.
- Thành thạo React.js, TypeScript, HTML, CSS.
- Hiểu biết về REST API, JWT, thiết kế database, DTO và service layer.
- Quen thuộc với Git, Swagger, Postman, Docker là một lợi thế.
- Tư duy hệ thống và khả năng xử lý lỗi trong môi trường production.

Ứng viên cần có khả năng giải thích kiến trúc fullstack, luồng frontend-backend, bảo mật API, tối ưu hóa cơ sở dữ liệu và xử lý lỗi production.`;

const MODAL_ANIM_MS = 220;

function SampleJdModal({
  onClose,
  onUse,
}: {
  onClose: () => void;
  onUse: (content: string) => void;
}) {
  const { t } = useLanguage();
  const src = t.studioPage.sources;
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  function close() {
    setVisible(false);
    timerRef.current = setTimeout(onClose, MODAL_ANIM_MS);
  }

  function handleCopy() {
    void navigator.clipboard.writeText(SAMPLE_JD).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity",
          visible ? "opacity-100" : "opacity-0"
        )}
        style={{ transitionDuration: `${MODAL_ANIM_MS}ms` }}
        onClick={close}
      />
      <div
        className={cn(
          "relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900",
          "max-h-[85vh] transition-all ease-[cubic-bezier(0.34,1.4,0.64,1)]",
          visible ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-3 opacity-0"
        )}
        style={{ transitionDuration: `${MODAL_ANIM_MS}ms` }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40">
              <BookOpen size={15} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className={cn("text-sm font-semibold leading-tight", portalHeading)}>{src.sampleJd}</p>
              <p className={cn("mt-0.5 text-[11px]", portalSubtext)}>Fullstack Developer · 1–3 năm kinh nghiệm</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mx-5 h-px shrink-0 bg-gray-100 dark:bg-gray-800" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <pre className={cn(
            "whitespace-pre-wrap rounded-xl border border-gray-100 bg-gray-50 p-4 font-sans text-[13px] leading-relaxed dark:border-gray-700/50 dark:bg-gray-800/60",
            portalHeading
          )}>
            {SAMPLE_JD}
          </pre>
        </div>

        <div className="mx-5 h-px shrink-0 bg-gray-100 dark:bg-gray-800" />

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-2 px-5 py-4">
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors",
              "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800",
              portalHeading
            )}
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            {copied ? src.copied : "Copy"}
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={close}
            className={cn(
              "h-8 rounded-lg border px-4 text-xs font-semibold transition-colors",
              "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800",
              portalHeading
            )}
          >
            {src.close}
          </button>
          <button
            type="button"
            onClick={() => { onUse(SAMPLE_JD); close(); }}
            className="shimmer-button h-8 rounded-lg px-4 text-xs font-semibold text-white hr-cta-btn"
          >
            {src.useSample}
          </button>
        </div>
      </div>
    </div>,
    document.body
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
  jdLocked = false,
  jdLockedTitle,
}: Props) {
  const { t } = useLanguage();
  const src = t.studioPage.sources;
  const jdBlocked = locked || jdLocked;
  const [jdMode, setJdMode] = useState<JdMode>(jdFileName ? "upload" : "paste");
  const [sampleOpen, setSampleOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryDocs, setLibraryDocs] = useState<StudioLibraryDocument[]>([]);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [attaching, setAttaching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (jdFileName) setJdMode("upload");
  }, [jdFileName]);

  const counts = useMemo(() => {
    const words = jdContent.trim() ? jdContent.trim().split(/\s+/).length : 0;
    return { words, chars: jdContent.length };
  }, [jdContent]);

  const hasJd = Boolean(jdContent.trim()) || Boolean(jdFileName);
  const skills = summary?.skills ?? [];
  const selectedDocCount = documents.filter((d) => d.isSelected).length;

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
      setJdMode("upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function togglePick(id: string, alreadyAttached: boolean, status: string) {
    if (alreadyAttached || status.toUpperCase() !== "COMPLETED") return;
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

  const attachableCount = libraryDocs.filter((d) => !d.alreadyAttached && d.status.toUpperCase() === "COMPLETED").length;

  return (
    <div className={cn(portalCard, "relative space-y-4 p-3.5", locked && "opacity-60")}>
      {locked && (
        <div
          className="absolute inset-0 z-10 cursor-not-allowed rounded-xl"
          title={src.lockedTitle}
          aria-hidden
        />
      )}

      <fieldset disabled={locked} className="min-w-0 space-y-4 border-0 p-0">

        {/* ── JD section ── */}
        <section className={cn("relative space-y-2.5", jdBlocked && !locked && "opacity-70")}>
          {jdLocked && !locked && (
            <div
              className="absolute inset-0 z-10 cursor-not-allowed rounded-xl"
              title={jdLockedTitle ?? src.quotaLockedTitle}
              aria-hidden
            />
          )}
          <fieldset disabled={jdBlocked} className="min-w-0 space-y-2.5 border-0 p-0">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{src.jdTitle}</span>
              <button
                type="button"
                onClick={() => setSampleOpen(true)}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                  "border-violet-200 text-violet-600 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-950/40"
                )}
              >
                <BookOpen size={10} />
                {src.sampleJd}
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">{src.required}</span>
              {hasJd && (
                <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Check className="h-2 w-2" strokeWidth={3} />
                  OK
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800/50">
            {(["paste", "upload"] as JdMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setJdMode(mode)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors",
                  jdMode === mode
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                )}
              >
                {mode === "paste" ? src.pasteMode : src.uploadMode}
              </button>
            ))}
          </div>

          <div key={jdMode} style={{ animation: "fadeSlideIn 0.18s ease-out both" }}>
          {jdMode === "paste" ? (
            <div className="space-y-2">
              <textarea
                value={jdContent}
                onChange={(e) => onJdChange(e.target.value)}
                placeholder={src.placeholder}
                rows={10}
                className="w-full min-h-48 max-h-80 resize-y rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
              <div className="flex items-center justify-between gap-2">
                <p className={cn("text-[10px]", portalSubtext)}>
                  {counts.words > 0
                    ? src.wordCount.replace("{{words}}", String(counts.words)).replace("{{chars}}", String(counts.chars))
                    : src.noContent}
                </p>
                <button
                  type="button"
                  onClick={() => void onSaveJd()}
                  disabled={!jdContent.trim()}
                  className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-medium text-white disabled:opacity-40 hover:bg-primary-hover transition-colors"
                >
                  {src.saveAndAnalyze}
                </button>
              </div>
            </div>
          ) : jdFileName && !uploading ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 dark:border-primary/30 dark:bg-primary/10">
                <JdFileIcon fileName={jdFileName} />
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm font-medium", portalHeading)} title={jdFileName}>
                    {jdFileName}
                  </p>
                  <p className={cn("text-[11px]", portalSubtext)}>
                    {src.uploadedInfo.replace("{{words}}", String(counts.words))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-700 transition-colors hover:border-primary/40 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                >
                  {src.replaceFile}
                </button>
              </div>
              <input ref={fileRef} type="file" className="hidden" accept={JD_ACCEPT} onChange={(e) => void handleJdFile(e.target.files?.[0])} />
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); void handleJdFile(e.dataTransfer.files?.[0]); }}
                className={cn(
                  "rounded-xl border border-dashed px-3 py-2 text-center text-[11px] transition-colors",
                  dragging ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-400 dark:border-gray-700"
                )}
              >
                {src.dropToReplace}
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); void handleJdFile(e.dataTransfer.files?.[0]); }}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
                dragging ? "border-primary bg-primary/5 dark:bg-primary/10" : "border-gray-200 hover:border-primary/50 dark:border-gray-700 dark:hover:border-primary/40"
              )}
            >
              {uploading ? (
                <Loader2 size={22} className="animate-spin text-primary" />
              ) : (
                <FileText size={22} className="text-primary" />
              )}
              <p className={cn("text-sm font-medium", portalHeading)}>
                {uploading ? src.uploadingAnalyzing : src.dropOrClick}
              </p>
              <p className={cn("text-xs", portalSubtext)}>PDF · DOCX · TXT · JPG · PNG · max 20 MB</p>
              <input ref={fileRef} type="file" className="hidden" accept={JD_ACCEPT} onChange={(e) => void handleJdFile(e.target.files?.[0])} />
            </div>
          )}
          </div>
          </fieldset>
        </section>

        {/* ── Auto-detected summary ── */}
        {summary && (
          <section className="space-y-1.5">
            <SectionLabel text={src.autoDetect} />
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-2.5 dark:border-gray-800 dark:bg-gray-950/40">
              {/* Role / seniority / language */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {[
                  { label: src.colRole, value: summary.detectedRole },
                  { label: src.colLevel, value: summary.detectedSeniority },
                  { label: src.colLang, value: summary.detectedLanguage },
                ].filter(({ value }) => Boolean(value)).map(({ label, value }) => (
                  <div key={label} className="min-w-0">
                    <p className="text-[9px] uppercase tracking-wide text-gray-400">{label}</p>
                    <p className={cn("truncate text-[11px] font-semibold", portalHeading)}>{value}</p>
                  </div>
                ))}
              </div>
              {/* Skills */}
              {skills.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-[9px] uppercase tracking-wide text-gray-400">{src.colSkills} · {skills.length}</p>
                  <div className="flex flex-wrap gap-1">
                    {skills.slice(0, 8).map((skill) => (
                      <span key={skill} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        {skill}
                      </span>
                    ))}
                    {skills.length > 8 && (
                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        +{skills.length - 8}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Knowledge documents ── */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel text={src.additionalDocs} required={false} />
            {selectedDocCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {src.inUse.replace("{{count}}", String(selectedDocCount))}
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            {onAttachFromLibrary && projectId && (
              <button
                type="button"
                onClick={() => setLibraryOpen((v) => !v)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-[11px] font-medium text-gray-600 whitespace-nowrap transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-gray-700 dark:text-gray-300 dark:hover:border-primary/50 dark:hover:bg-primary/10 dark:hover:text-primary"
              >
                <FolderOpen size={12} />
                {src.fromKb}
              </button>
            )}
            <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-[11px] font-medium text-gray-600 whitespace-nowrap transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-gray-700 dark:text-gray-300 dark:hover:border-primary/50 dark:hover:bg-primary/10 dark:hover:text-primary">
              <Upload size={12} />
              {src.uploadDoc}
              <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUploadDocument(f); }} />
            </label>
          </div>

          {/* Library picker */}
          {libraryOpen && (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900/60">
                <p className={cn("text-[11px] font-semibold", portalHeading)}>{src.selectFromKb}</p>
                <Link href="/hr/knowledge/" target="_blank" className="text-[10px] text-primary hover:underline">{src.manageKb}</Link>
              </div>
              {libraryLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 size={18} className="animate-spin text-primary" />
                </div>
              ) : libraryDocs.length === 0 ? (
                <div className="space-y-2 px-3 py-5 text-center">
                  <p className={cn("text-xs", portalSubtext)}>{src.kbEmpty}</p>
                  <Link href="/hr/knowledge/" className="text-xs font-medium text-primary hover:underline">
                    {src.uploadToKb}
                  </Link>
                </div>
              ) : (
                <ul className="max-h-48 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
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
                            disabled ? "cursor-not-allowed opacity-50" : picked ? "bg-primary/8" : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                          )}
                        >
                          <FileText size={13} className="shrink-0 text-blue-500" />
                          <span className={cn("min-w-0 flex-1 truncate text-[11px] font-medium", portalHeading)} title={doc.fileName}>
                            {doc.fileName}
                          </span>
                          <span className={cn("shrink-0 text-[10px]", portalSubtext)}>
                            {doc.alreadyAttached ? src.alreadyAttached : ready ? `${doc.chunkCount ?? 0} chunks` : doc.status}
                          </span>
                          {picked && <Check size={12} className="shrink-0 text-primary" strokeWidth={3} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-3 py-2 dark:border-gray-800">
                <p className={cn("text-[10px]", portalSubtext)}>
                  {attachableCount === 0
                    ? src.noMoreDocs
                    : src.selectedCount.replace("{{done}}", String(pickedIds.size)).replace("{{total}}", String(attachableCount))}
                </p>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setLibraryOpen(false)}
                    className="rounded-lg px-2.5 py-1 text-[11px] text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                    {src.close}
                  </button>
                  <button type="button" disabled={pickedIds.size === 0 || attaching || !onAttachFromLibrary} onClick={() => void handleAttach()}
                    className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-40">
                    {attaching ? src.attaching : src.attachDocs.replace("{{count}}", String(pickedIds.size))}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Document list */}
          {documents.length === 0 ? (
            <p className={cn("text-center text-xs", portalSubtext)}>
              {src.noDocs}
            </p>
          ) : (
            <div className="space-y-1.5">
              {documents.map((doc) => {
                const ragStatus = doc.ragStatus ?? doc.status;
                const ragDone = doc.status === "Completed" || (doc.ragStatus?.toUpperCase() === "COMPLETED");
                const chunkText = typeof doc.chunkCount === "number" ? ` · ${doc.chunkCount} chunks` : "";
                return (
                  <label
                    key={doc.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition-colors",
                      doc.isSelected
                        ? "border-primary/25 bg-primary/5 dark:border-primary/30 dark:bg-primary/10"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={doc.isSelected}
                      disabled={!ragDone && !doc.isSelected}
                      onChange={(e) => void onToggleDocument(doc.id, e.target.checked)}
                      className="mt-0.5 accent-primary"
                      title={ragDone ? src.ragUseHint : src.ragWaitHint}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={cn("truncate text-[11px] font-medium", portalHeading)}>
                          {doc.fileName}
                        </p>
                        {doc.isLibraryLink && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">KB</span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <RagStatusChip status={ragStatus} />
                        {doc.fileSize > 0 && (
                          <span className={cn("text-[10px]", portalSubtext)}>
                            {(doc.fileSize / 1024).toFixed(0)} KB{chunkText}
                          </span>
                        )}
                      </div>
                      {doc.processingError && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                          {doc.processingError}
                        </div>
                      )}
                    </div>
                    {!ragDone && (doc.ragStatus === "PROCESSING" || doc.status === "Processing") && (
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </section>
      </fieldset>

      {sampleOpen && (
        <SampleJdModal
          onClose={() => setSampleOpen(false)}
          onUse={(content) => {
            onJdChange(content);
            setJdMode("paste");
            void onSaveJd();
          }}
        />
      )}
    </div>
  );
}
