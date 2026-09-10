"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Check,
  Clock,
  FileImage,
  FileText,
  FolderOpen,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import type { AnalyzeJobDescriptionResponse, StudioDocument, StudioLibraryDocument, StudioKnowledgeSuggestion } from "@/features/studio/types/studio.types";
import * as studioApi from "@/features/studio/services/studio.service";
import { SampleJdModal } from "@/features/studio/components/sample-jd-modal";
import { SourceOriginBadge, useSourceOriginLabels } from "@/features/studio/components/source-origin-badge";
import { formatDetectedLanguage } from "@/features/studio/utils/format-detected-language";
import { cn } from "@/lib/cn";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { portalCard, portalHeading, portalInput, portalSubtext } from "@/shared/utils/portal-ui";
import { HR_DOCUMENT_TYPES } from "@/features/knowledge/types/knowledge";

const JD_MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const DOC_MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const JD_VALID_EXTS = /\.(pdf|docx?|txt|jpe?g|png)$/i;
const DOC_VALID_EXTS = /\.(pdf|docx?|txt)$/i;

interface Props {
  jdContent: string;
  onJdChange: (value: string) => void;
  onSaveJd: () => Promise<void> | void;
  onUploadJd: (file: File) => Promise<boolean> | boolean | void;
  /** SCRUM-432: cảnh báo vàng dưới paste/upload khi JD bị reject */
  jdInputWarning?: string | null;
  /** SCRUM-417: lưu Position + Level (+ Role / Skills) HR xác nhận */
  onSaveMetadata?: (payload: {
    position: string;
    detectedSeniority: string;
    detectedRole?: string | null;
    skills?: string[];
  }) => Promise<void> | void;
  /** @deprecated dùng onSaveMetadata */
  onSavePosition?: (position: string) => Promise<void> | void;
  jdFileName?: string | null;
  summary: AnalyzeJobDescriptionResponse | null;
  documents: StudioDocument[];
  onUploadDocument: (file: File, documentType?: string) => Promise<void> | void;
  onAttachFromLibrary?: (knowledgeDocumentIds: string[]) => Promise<void>;
  onFetchSuggestions?: () => Promise<StudioKnowledgeSuggestion[]>;
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

const SENIORITY_OPTIONS = ["Intern", "Junior", "Mid", "Senior", "Lead"] as const;

export function SourcesPanel({
  jdContent,
  onJdChange,
  onSaveJd,
  onUploadJd,
  jdInputWarning = null,
  onSaveMetadata,
  onSavePosition,
  jdFileName = null,
  summary,
  documents,
  onUploadDocument,
  onAttachFromLibrary,
  onFetchSuggestions,
  onToggleDocument,
  projectId,
  locked = false,
  jdLocked = false,
  jdLockedTitle,
}: Props) {
  // Derived once — reused everywhere a metadata-edit control needs to know
  // whether ANY save handler was provided, instead of repeating the disjunction.
  const hasMetadataSaveHandler = Boolean(onSaveMetadata || onSavePosition);
  const { t } = useLanguage();
  const src = t.studioPage.sources;
  const kbTypes = t.knowledgePage.documentTypes;
  const originLabels = useSourceOriginLabels();
  const { addToast } = useToast();
  const jdBlocked = locked || jdLocked;
  const [jdMode, setJdMode] = useState<JdMode>(jdFileName ? "upload" : "paste");
  const [sampleOpen, setSampleOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<string>("InternalStack");
  const [suggestions, setSuggestions] = useState<StudioKnowledgeSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [positionDraft, setPositionDraft] = useState("");
  const [roleDraft, setRoleDraft] = useState("");
  const [levelDraft, setLevelDraft] = useState("");
  const [skillsDraft, setSkillsDraft] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(null);
  const [respExpanded, setRespExpanded] = useState(false);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [libraryDocs, setLibraryDocs] = useState<StudioLibraryDocument[]>([]);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [attaching, setAttaching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (jdFileName) setJdMode("upload");
  }, [jdFileName]);

  // SCRUM-417: sync draft từ analyze/upload/GET
  useEffect(() => {
    setPositionDraft(summary?.position?.trim() || "");
    setRoleDraft(summary?.detectedRole?.trim() || "");
    setLevelDraft(summary?.detectedSeniority?.trim() || "");
    setSkillsDraft(Array.isArray(summary?.skills) ? [...summary.skills] : []);
    setSkillInput("");
    setEditingSkillIndex(null);
  }, [summary?.position, summary?.detectedRole, summary?.detectedSeniority, summary?.skills]);

  const skillsEqual = useCallback((a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    return a.every((s, i) => s === b[i]);
  }, []);

  const metadataDirty = useMemo(() => {
    const savedPos = summary?.position?.trim() || "";
    const savedRole = summary?.detectedRole?.trim() || "";
    const savedLevel = summary?.detectedSeniority?.trim() || "";
    const savedSkills = summary?.skills ?? [];
    return (
      positionDraft.trim() !== savedPos ||
      roleDraft.trim() !== savedRole ||
      levelDraft.trim() !== savedLevel ||
      !skillsEqual(skillsDraft, savedSkills)
    );
  }, [
    positionDraft,
    roleDraft,
    levelDraft,
    skillsDraft,
    skillsEqual,
    summary?.position,
    summary?.detectedRole,
    summary?.detectedSeniority,
    summary?.skills,
  ]);

  const canSaveMetadata = Boolean(
    hasMetadataSaveHandler &&
      positionDraft.trim() &&
      levelDraft.trim() &&
      metadataDirty
  );

  const addSkill = useCallback(() => {
    const next = skillInput.trim();
    if (!next) return;
    const exists = skillsDraft.some((s) => s.toLowerCase() === next.toLowerCase());
    if (exists) {
      setSkillInput("");
      return;
    }
    if (skillsDraft.length >= 20) {
      addToast("error", src.skillsMaxHint ?? "Tối đa 20 kỹ năng.");
      return;
    }
    setSkillsDraft((prev) => [...prev, next]);
    setSkillInput("");
  }, [addToast, skillInput, skillsDraft, src.skillsMaxHint]);

  const removeSkill = useCallback((index: number) => {
    setSkillsDraft((prev) => prev.filter((_, i) => i !== index));
    if (editingSkillIndex === index) setEditingSkillIndex(null);
  }, [editingSkillIndex]);

  const commitEditSkill = useCallback((index: number, value: string) => {
    const trimmed = value.trim();
    setEditingSkillIndex(null);
    if (!trimmed) {
      removeSkill(index);
      return;
    }
    setSkillsDraft((prev) => {
      const dup = prev.some((s, i) => i !== index && s.toLowerCase() === trimmed.toLowerCase());
      if (dup) return prev;
      return prev.map((s, i) => (i === index ? trimmed : s));
    });
  }, [removeSkill]);

  const handleSaveMetadata = useCallback(async () => {
    const position = positionDraft.trim();
    const seniority = levelDraft.trim();
    if (!position) {
      addToast("error", src.positionRequiredHint);
      return;
    }
    if (!seniority) {
      addToast("error", src.levelRequiredHint);
      return;
    }
    setSavingMetadata(true);
    try {
      if (onSaveMetadata) {
        await onSaveMetadata({
          position,
          detectedSeniority: seniority,
          detectedRole: roleDraft.trim() || null,
          skills: skillsDraft,
        });
      } else if (onSavePosition) {
        await onSavePosition(position);
      }
    } finally {
      setSavingMetadata(false);
    }
  }, [
    addToast,
    levelDraft,
    onSaveMetadata,
    onSavePosition,
    positionDraft,
    roleDraft,
    skillsDraft,
    src.levelRequiredHint,
    src.positionRequiredHint,
  ]);

  const counts = useMemo(() => {
    const words = jdContent.trim() ? jdContent.trim().split(/\s+/).length : 0;
    return { words, chars: jdContent.length };
  }, [jdContent]);

  const hasJd = Boolean(jdContent.trim()) || Boolean(jdFileName);
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

  // SCRUM-443: gợi ý gắn sau khi có JD phân tích
  useEffect(() => {
    if (!onFetchSuggestions || !projectId || !summary || !jdContent.trim()) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setSuggestionsLoading(true);
    // Debounce — jdContent changes on every keystroke while the HR keeps editing
    // the JD post-analyze; without this, each keystroke fired its own request.
    const timer = setTimeout(() => {
      void onFetchSuggestions().then((list) => {
        if (!cancelled) {
          setSuggestions(list);
          setSuggestionsLoading(false);
        }
      });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [onFetchSuggestions, projectId, summary, jdContent]);

  async function handleJdFile(file: File | undefined | null) {
    if (!file) return;
    if (!JD_VALID_EXTS.test(file.name)) {
      addToast("error", src.jdInvalidType);
      return;
    }
    if (file.size > JD_MAX_BYTES) {
      addToast("error", src.jdFileTooLarge);
      return;
    }
    setUploading(true);
    try {
      // onUploadJd no longer throws on failure — it returns false instead, so
      // check the result explicitly rather than relying on a rejected promise.
      const success = await onUploadJd(file);
      if (success !== false) setJdMode("upload");
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
    <div className={cn(portalCard, "relative space-y-4 p-3.5")}>
      {locked && (
        <div
          className="absolute inset-0 z-10 cursor-not-allowed rounded-xl"
          title={src.lockedTitle}
          aria-hidden
        />
      )}

      <fieldset
        disabled={locked}
        className={cn(
          "min-w-0 space-y-4 border-0 p-0",
          locked && "pointer-events-none opacity-50",
          "disabled:[&_input]:opacity-60 disabled:[&_select]:opacity-60 disabled:[&_button]:opacity-60 disabled:[&_textarea]:opacity-60"
        )}
      >
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
              {jdInputWarning && (
                <p className="flex items-start gap-1 text-[10px] font-medium leading-snug text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  <span>{jdInputWarning}</span>
                </p>
              )}
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
              {jdInputWarning && (
                <p className="flex items-start gap-1 text-[10px] font-medium leading-snug text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  <span>{jdInputWarning}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
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
              {jdInputWarning && (
                <p className="flex items-start gap-1 text-[10px] font-medium leading-snug text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  <span>{jdInputWarning}</span>
                </p>
              )}
            </div>
          )}
          </div>
          </fieldset>
        </section>

        {/* ── Auto-detected summary + confirm Position/Level/Role (SCRUM-417) ── */}
        {summary && (
          <section className="space-y-1.5">
            <SectionLabel text={src.autoDetect} />
            <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/60 p-2.5 dark:border-gray-800 dark:bg-gray-950/40">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] uppercase tracking-wide text-gray-400">{src.positionLabel}</p>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">{src.required}</span>
                </div>
                <input
                  type="text"
                  value={positionDraft}
                  maxLength={150}
                  disabled={jdBlocked || !hasMetadataSaveHandler}
                  onChange={(e) => setPositionDraft(e.target.value)}
                  placeholder={src.positionPlaceholder}
                  className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] uppercase tracking-wide text-gray-400">{src.roleLabel}</p>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">{src.optional}</span>
                </div>
                <input
                  type="text"
                  value={roleDraft}
                  maxLength={150}
                  disabled={jdBlocked || !hasMetadataSaveHandler}
                  onChange={(e) => setRoleDraft(e.target.value)}
                  placeholder={src.rolePlaceholder}
                  className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] uppercase tracking-wide text-gray-400">{src.levelLabel}</p>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">{src.required}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {SENIORITY_OPTIONS.map((opt) => {
                    const active = levelDraft === opt;
                    const aiHint = summary?.detectedSeniority?.trim() === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={jdBlocked || !hasMetadataSaveHandler}
                        onClick={() => setLevelDraft(opt)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors disabled:opacity-40",
                          active
                            ? "border-primary bg-primary text-white"
                            : "border-gray-200 bg-white text-gray-600 hover:border-primary/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        )}
                        title={aiHint ? src.aiSuggestedLevel : undefined}
                      >
                        {opt}
                        {aiHint && !active ? (
                          <span className="ml-1 text-[8px] font-medium text-primary">AI</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                {summary?.detectedSeniority?.trim() && levelDraft !== summary.detectedSeniority.trim() && (
                  <p className={cn("text-[10px]", portalSubtext)}>
                    {src.aiSuggestedLevelHint?.replace("{{level}}", summary.detectedSeniority.trim())
                      ?? `AI gợi ý: ${summary.detectedSeniority.trim()}`}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] uppercase tracking-wide text-gray-400">
                    {src.colSkills} · {skillsDraft.length}
                  </p>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {src.optional}
                  </span>
                </div>
                <p className={cn("text-[10px] leading-snug", portalSubtext)}>{src.skillsEditHint}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {skillsDraft.map((skill, idx) => {
                    const skillIcon = editingSkillIndex === idx ? null : getSkillIcon(skill);
                    const SIcon = skillIcon?.icon;
                    return (
                    <span
                      key={`${skill}-${idx}`}
                      className="inline-flex min-w-0 w-full items-center gap-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                    >
                      {editingSkillIndex === idx ? (
                        <input
                          autoFocus
                          defaultValue={skill}
                          maxLength={80}
                          disabled={jdBlocked}
                          className="min-w-0 flex-1 rounded bg-white px-1 py-0 text-[10px] text-gray-900 outline-none dark:bg-gray-900 dark:text-gray-100"
                          onBlur={(e) => commitEditSkill(idx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitEditSkill(idx, (e.target as HTMLInputElement).value);
                            }
                            if (e.key === "Escape") setEditingSkillIndex(null);
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          disabled={jdBlocked}
                          className="inline-flex min-w-0 flex-1 items-center gap-1 truncate text-left disabled:opacity-50"
                          onClick={() => setEditingSkillIndex(idx)}
                          title={src.skillsEditTag}
                        >
                          {SIcon ? (
                            <SIcon
                              aria-hidden
                              size={11}
                              className={cn("shrink-0", skillIcon!.className)}
                            />
                          ) : null}
                          <span className="truncate">{skill}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={jdBlocked}
                        onClick={() => removeSkill(idx)}
                        className="shrink-0 rounded-full p-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                        aria-label={src.skillsRemove}
                      >
                        <X className="h-2.5 w-2.5" strokeWidth={3} />
                      </button>
                    </span>
                    );
                  })}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={skillInput}
                    maxLength={80}
                    disabled={jdBlocked || !hasMetadataSaveHandler}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder={src.skillsAddPlaceholder}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    disabled={jdBlocked || !skillInput.trim() || !hasMetadataSaveHandler}
                    onClick={addSkill}
                    className="shrink-0 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary disabled:opacity-40 hover:bg-primary/15"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <p className={cn("min-w-0 flex-1 text-[10px]", portalSubtext)}>
                  {!positionDraft.trim()
                    ? src.positionRequiredHint
                    : !levelDraft.trim()
                      ? src.levelRequiredHint
                      : metadataDirty
                        ? src.metadataDirtyHint
                        : src.metadataHint}
                </p>
                <button
                  type="button"
                  disabled={jdBlocked || !canSaveMetadata || savingMetadata}
                  onClick={() => void handleSaveMetadata()}
                  className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-medium text-white disabled:opacity-40 hover:bg-primary-hover transition-colors"
                >
                  {savingMetadata ? <Loader2 size={12} className="animate-spin" /> : src.metadataSave}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {[
                  {
                    label: src.colLang,
                    value: formatDetectedLanguage(summary.detectedLanguage, {
                      vietnamese: src.langVietnamese,
                      english: src.langEnglish,
                      unknown: src.unknownValue,
                    }),
                    hasValue: Boolean(summary.detectedLanguage?.trim()),
                  },
                ].map(({ label, value, hasValue }) => (
                  <div key={label} className="min-w-0">
                    <p className="text-[9px] uppercase tracking-wide text-gray-400">{label}</p>
                    <p
                      className={cn(
                        "truncate text-[11px] font-semibold",
                        hasValue ? portalHeading : "text-gray-400 italic font-normal"
                      )}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              {summary.summary?.trim() && (
                <div className="mt-2 space-y-1">
                  <p className="text-[9px] uppercase tracking-wide text-gray-400">{src.colSummary}</p>
                  <p className={cn("text-[11px] leading-snug", portalSubtext)}>{summary.summary}</p>
                </div>
              )}
              {(summary.responsibilities?.length ?? 0) > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-[9px] uppercase tracking-wide text-gray-400">{src.colResponsibilities}</p>
                  <ul className={cn("list-disc space-y-0.5 pl-4 text-[10px] leading-snug", portalSubtext)}>
                    {(respExpanded ? summary.responsibilities! : summary.responsibilities!.slice(0, 3)).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {summary.responsibilities!.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setRespExpanded((v) => !v)}
                      className="text-[10px] font-medium text-primary hover:underline"
                    >
                      {respExpanded ? src.viewLess : src.viewMore}
                    </button>
                  )}
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
          <p className={cn("text-[10px] leading-snug", portalSubtext)}>{src.sourcesAdminAutoHint}</p>

          {suggestionsLoading && (
            <p className={cn("text-[10px] flex items-center gap-1", portalSubtext)}>
              <Loader2 size={12} className="animate-spin" />
              {src.suggestionsLoading ?? "Đang gợi ý tài liệu khớp JD…"}
            </p>
          )}
          {!suggestionsLoading && suggestions.length > 0 && onAttachFromLibrary && (
            <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/20 p-2.5 space-y-2">
              <p className="text-[11px] font-semibold text-violet-800 dark:text-violet-200">
                {(src.suggestionsTitle ?? "{{count}} tài liệu khớp JD").replace("{{count}}", String(suggestions.length))}
              </p>
              <ul className="space-y-1">
                {suggestions.slice(0, 5).map((s) => (
                  <li key={s.knowledgeDocumentId} className="flex items-center justify-between gap-2 text-[10px]">
                    <span className={cn("truncate", portalHeading)} title={s.fileName}>
                      {s.fileName}
                      <span className="ml-1 text-violet-600">
                        ({(kbTypes as Record<string, string> | undefined)?.[s.documentType] ?? s.documentType})
                      </span>
                    </span>
                    <button
                      type="button"
                      className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold text-white"
                      onClick={() => void onAttachFromLibrary([s.knowledgeDocumentId]).then(() => {
                        setSuggestions((prev) => prev.filter((x) => x.knowledgeDocumentId !== s.knowledgeDocumentId));
                      })}
                    >
                      {src.attachOne ?? "Gắn"}
                    </button>
                  </li>
                ))}
              </ul>
              {suggestions.length > 1 && (
                <button
                  type="button"
                  className="text-[10px] font-medium text-primary hover:underline"
                  onClick={() => {
                    const ids = suggestions.map((s) => s.knowledgeDocumentId);
                    void onAttachFromLibrary(ids).then(() => setSuggestions([]));
                  }}
                >
                  {(src.attachAllSuggestions ?? "Gắn tất cả ({{count}})").replace("{{count}}", String(suggestions.length))}
                </button>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className={cn("text-[10px] font-medium", portalSubtext)}>
              {src.uploadDocType ?? "Loại khi upload"}
            </label>
            <select
              value={uploadDocType}
              onChange={(e) => setUploadDocType(e.target.value)}
              className={cn("w-full rounded-lg border px-2 py-1.5 text-[11px]", portalInput)}
            >
              {HR_DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {(kbTypes as Record<string, string> | undefined)?.[t] ?? t}
                </option>
              ))}
            </select>
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
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  if (!DOC_VALID_EXTS.test(f.name)) { addToast("error", src.docInvalidType); return; }
                  if (f.size > DOC_MAX_BYTES) { addToast("error", src.docFileTooLarge); return; }
                  void onUploadDocument(f, uploadDocType);
                }}
              />
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
                          <SourceOriginBadge scopeOrKb={doc.scope ?? "HR"} labels={originLabels} />
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
                        <SourceOriginBadge scopeOrKb={doc.scope ?? "HR"} labels={originLabels} />
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
