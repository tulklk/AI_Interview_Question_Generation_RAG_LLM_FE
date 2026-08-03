"use client";

import { useState, useId, useRef, useCallback } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileSpreadsheet,
  GripVertical,
  ListPlus,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { portalCard, portalHeading, portalSubtext, portalInput } from "@/shared/utils/portal-ui";

// ── Types ─────────────────────────────────────────────────────────────────────

type QuestionType = "Technical" | "Behavioral" | "Situational" | "System-design" | "Problem-solving";
type Difficulty   = "Easy" | "Medium" | "Hard";

interface ManualQuestion {
  id: string;
  content: string;
  type: QuestionType;
  difficulty: Difficulty;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

const QUESTION_TYPES: { value: QuestionType; labelVi: string; labelEn: string; color: string }[] = [
  { value: "Technical",       labelVi: "Kỹ thuật",           labelEn: "Technical",       color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "Behavioral",      labelVi: "Hành vi",            labelEn: "Behavioral",      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  { value: "Situational",     labelVi: "Tình huống",         labelEn: "Situational",     color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  { value: "System-design",   labelVi: "System design",      labelEn: "System design",   color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
  { value: "Problem-solving", labelVi: "Giải quyết vấn đề", labelEn: "Problem-solving",  color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
];

const DIFFICULTY_OPTS: { value: Difficulty; labelVi: string; labelEn: string }[] = [
  { value: "Easy",   labelVi: "Dễ",  labelEn: "Easy"   },
  { value: "Medium", labelVi: "Vừa", labelEn: "Medium" },
  { value: "Hard",   labelVi: "Khó", labelEn: "Hard"   },
];

const LEVELS = ["Intern", "Fresher", "Junior", "Mid-level", "Senior", "Lead", "Manager"];

// Aliases for Excel column values (both EN and VI recognised)
const TYPE_ALIASES: Record<string, QuestionType> = {
  technical: "Technical", "kỹ thuật": "Technical", "ky thuat": "Technical",
  behavioral: "Behavioral", "hành vi": "Behavioral", "hanh vi": "Behavioral",
  situational: "Situational", "tình huống": "Situational", "tinh huong": "Situational",
  "system-design": "System-design", "system design": "System-design",
  "problem-solving": "Problem-solving", "giải quyết vấn đề": "Problem-solving",
};

const DIFF_ALIASES: Record<string, Difficulty> = {
  easy: "Easy", dễ: "Easy", de: "Easy",
  medium: "Medium", vừa: "Medium", vua: "Medium", "trung bình": "Medium",
  hard: "Hard", khó: "Hard", kho: "Hard",
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function makeBlank(): ManualQuestion {
  return { id: uid(), content: "", type: "Technical", difficulty: "Medium" };
}

// ── Excel helpers ─────────────────────────────────────────────────────────────

function parseExcel(buffer: ArrayBuffer): ManualQuestion[] {
  const wb   = XLSX.read(buffer, { type: "array" });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });

  const result: ManualQuestion[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row     = rows[i];
    const content = String(row[0] ?? "").trim();
    if (!content) continue;
    const rawType = String(row[1] ?? "").trim().toLowerCase();
    const rawDiff = String(row[2] ?? "").trim().toLowerCase();
    result.push({
      id: uid(),
      content,
      type: TYPE_ALIASES[rawType] ?? "Technical",
      difficulty: DIFF_ALIASES[rawDiff] ?? "Medium",
    });
  }
  return result;
}

function downloadExcelTemplate(isVi: boolean) {
  const headers = isVi
    ? ["Câu hỏi", "Loại", "Độ khó"]
    : ["Question", "Type", "Difficulty"];

  const examples = isVi
    ? [
        ["Hãy mô tả kinh nghiệm của bạn với React hooks.", "Technical", "Medium"],
        ["Bạn đã từng giải quyết xung đột trong team như thế nào?", "Behavioral", "Easy"],
        ["Nếu deadline sắp đến mà vẫn còn bug nghiêm trọng, bạn xử lý ra sao?", "Situational", "Hard"],
      ]
    : [
        ["Describe your experience with React hooks.", "Technical", "Medium"],
        ["Tell me about a conflict you resolved within your team.", "Behavioral", "Easy"],
        ["If a critical bug appears right before a deadline, what do you do?", "Situational", "Hard"],
      ];

  const typeNote = isVi
    ? ["", "Loại hợp lệ: Technical, Behavioral, Situational, System-design, Problem-solving"]
    : ["", "Valid types: Technical, Behavioral, Situational, System-design, Problem-solving"];
  const diffNote = isVi
    ? ["", "", "Độ khó hợp lệ: Easy, Medium, Hard"]
    : ["", "", "Valid difficulty: Easy, Medium, Hard"];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples, [], typeNote, diffNote]);
  ws["!cols"] = [{ wch: 70 }, { wch: 20 }, { wch: 15 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, isVi ? "Câu hỏi" : "Questions");
  XLSX.writeFile(wb, isVi ? "mau_cau_hoi.xlsx" : "question_template.xlsx");
}

// ── Drop zone modal ───────────────────────────────────────────────────────────

interface DropZoneModalProps {
  isVi: boolean;
  mp: ReturnType<typeof useLanguage>["t"]["manualPage"];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
  onCancel: () => void;
  onDownloadTemplate: () => void;
}

function DropZoneModal({ isVi, mp, fileInputRef, onFile, onCancel, onDownloadTemplate }: DropZoneModalProps) {
  const ex = mp.excel;
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="dropzone-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <FileSpreadsheet size={16} className="text-green-600 dark:text-green-400" />
            </div>
            <h3 id="dropzone-modal-title" className={cn("text-sm font-semibold", portalHeading)}>
              {ex.dropModalTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={ex.cancelBtn}
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Steps */}
          <ol className="flex flex-col gap-1.5">
            {[ex.step1, ex.step2, ex.step3].map((step, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500 dark:text-gray-400 shrink-0">
                  {i + 1}
                </span>
                {i === 0 ? (
                  <span>
                    <button
                      type="button"
                      onClick={onDownloadTemplate}
                      className="font-medium text-primary hover:underline"
                    >
                      {step}
                    </button>
                  </span>
                ) : (
                  <span>{step}</span>
                )}
              </li>
            ))}
          </ol>

          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition-colors cursor-default",
              dragging
                ? "border-primary bg-primary/5 dark:bg-primary/10"
                : "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 hover:border-gray-300 dark:hover:border-gray-600",
            )}
          >
            {dragging ? (
              <>
                <Upload size={28} className="text-primary animate-bounce" />
                <p className="text-sm font-semibold text-primary">{ex.dropZoneActive}</p>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <FileSpreadsheet size={22} className="text-green-500" />
                </div>
                <div className="text-center">
                  <p className={cn("text-sm font-medium", portalHeading)}>{ex.dropZoneLabel}</p>
                  <p className={cn("text-xs mt-0.5", portalSubtext)}>{ex.dropZoneOr}</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors shadow-sm"
                >
                  <Upload size={14} />
                  {ex.dropZoneBtn}
                </button>
                <p className={cn("text-[11px]", portalSubtext)}>{ex.dropZoneHint}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Confirm import modal ──────────────────────────────────────────────────────

interface ConfirmImportModalProps {
  count: number;
  isVi: boolean;
  mp: ReturnType<typeof useLanguage>["t"]["manualPage"];
  onAppend: () => void;
  onReplace: () => void;
  onCancel: () => void;
}

function ConfirmImportModal({ count, isVi, mp, onAppend, onReplace, onCancel }: ConfirmImportModalProps) {
  const ex = mp.excel;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="confirm-import-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl animate-scale-in"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30 shrink-0">
              <FileSpreadsheet size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 id="confirm-import-title" className={cn("text-sm font-semibold", portalHeading)}>
                {ex.confirmTitle}
              </h3>
              <p className={cn("text-xs mt-0.5", portalSubtext)}>
                {ex.confirmDesc.replace("{{count}}", String(count))}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="mt-0.5 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
            aria-label={ex.cancelBtn}
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 pb-5 pt-2 space-y-2">
          <button
            type="button"
            onClick={onAppend}
            className="flex w-full items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors text-left"
          >
            <Plus size={15} className="shrink-0" />
            <div>
              <p className="font-semibold">{ex.appendBtn}</p>
              <p className="text-xs text-primary/70 mt-0.5">
                {isVi ? "Giữ câu hỏi hiện có, thêm vào cuối" : "Keep current questions, append to end"}
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={onReplace}
            className="flex w-full items-center gap-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-red-300 hover:text-red-600 dark:hover:border-red-700 dark:hover:text-red-400 transition-colors text-left"
          >
            <Trash2 size={15} className="shrink-0" />
            <div>
              <p className="font-semibold">{ex.replaceBtn}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {isVi ? "Xoá câu hỏi hiện có, dùng dữ liệu từ file" : "Delete current questions, use file data"}
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl px-4 py-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {ex.cancelBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ManualQuestionPage() {
  const { t, lang } = useLanguage();
  const { addToast } = useToast();
  const mp   = t.manualPage;
  const isVi = lang === "vi";

  const roleId     = useId();
  const levelId    = useId();
  const durationId = useId();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const listEndRef   = useRef<HTMLDivElement>(null);

  const [role,          setRole]          = useState("");
  const [level,         setLevel]         = useState("Mid-level");
  const [duration,      setDuration]      = useState(60);
  const [questions,     setQuestions]     = useState<ManualQuestion[]>(() =>
    Array.from({ length: PAGE_SIZE }, makeBlank),
  );
  const [page,          setPage]          = useState(1);
  const [saving,        setSaving]        = useState(false);
  const [submitted,     setSubmitted]     = useState(false);
  const [showDropZone,  setShowDropZone]  = useState(false);
  const [pendingImport, setPendingImport] = useState<ManualQuestion[] | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────

  const totalCount = questions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const activePage = Math.min(page, totalPages);
  const pageStart  = (activePage - 1) * PAGE_SIZE;
  const pageItems  = questions.slice(pageStart, pageStart + PAGE_SIZE);

  const roleError   = submitted && !role.trim();
  const noQuestions = submitted && totalCount === 0;
  const filledCount = questions.filter((q) => q.content.trim()).length;

  function questionHasError(q: ManualQuestion) {
    return submitted && !q.content.trim();
  }

  // ── Question handlers ─────────────────────────────────────────────────────

  function addQuestion() {
    const nextTotal = totalCount + 1;
    setQuestions((prev) => [...prev, makeBlank()]);
    setPage(Math.ceil(nextTotal / PAGE_SIZE));
    setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 60);
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function cloneQuestion(id: string) {
    const srcIdx = questions.findIndex((q) => q.id === id);
    setQuestions((prev) => {
      if (srcIdx === -1) return prev;
      const copy = { ...prev[srcIdx], id: uid() };
      const next = [...prev];
      next.splice(srcIdx + 1, 0, copy);
      return next;
    });
    if (srcIdx !== -1) setPage(Math.ceil((srcIdx + 2) / PAGE_SIZE));
    addToast("success", mp.toast.cloned);
  }

  function patchQuestion(id: string, patch: Partial<ManualQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  // ── Excel handlers ────────────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      addToast("error", mp.excel.invalidType);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const buf    = ev.target?.result as ArrayBuffer;
        const parsed = parseExcel(buf);
        if (parsed.length === 0) {
          addToast("error", mp.excel.importEmpty);
          return;
        }
        setShowDropZone(false);
        setPendingImport(parsed);
      } catch {
        addToast("error", mp.excel.importError);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [addToast, mp.excel]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) processFile(file);
  }

  function commitImport(mode: "append" | "replace") {
    if (!pendingImport) return;
    if (mode === "replace") {
      setQuestions(pendingImport);
      setPage(1);
    } else {
      const newTotal = totalCount + pendingImport.length;
      setQuestions((prev) => [...prev, ...pendingImport]);
      setPage(Math.ceil(newTotal / PAGE_SIZE));
    }
    addToast("success", mp.excel.importSuccess.replace("{{count}}", String(pendingImport.length)));
    setPendingImport(null);
  }

  // ── Save / export ─────────────────────────────────────────────────────────

  function handleSave() {
    setSubmitted(true);
    const filled = questions.filter((q) => q.content.trim());
    if (!role.trim()) { addToast("error", mp.validation.roleRequired); return; }
    if (filled.length === 0) { addToast("error", mp.validation.questionsRequired); return; }
    if (questions.some((q) => !q.content.trim())) { addToast("error", mp.validation.questionContentRequired); return; }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      addToast("success", mp.toast.saved.replace("{{role}}", role).replace("{{count}}", String(filled.length)));
    }, 800);
  }

  function handleExport() {
    const filled = questions.filter((q) => q.content.trim());
    if (!role.trim() || filled.length === 0) { addToast("error", mp.validation.exportMinRequired); return; }
    const lines = [
      `${mp.heading}: ${role} — ${level}`,
      `${mp.setInfoCard.durationLabel}: ${duration} ${mp.setInfoCard.durationUnit}`,
      "",
      ...filled.map((q, i) => {
        const typeLabel = QUESTION_TYPES.find((ty) => ty.value === q.type)?.[isVi ? "labelVi" : "labelEn"] ?? q.type;
        const diffLabel = DIFFICULTY_OPTS.find((d) => d.value === q.difficulty)?.[isVi ? "labelVi" : "labelEn"] ?? q.difficulty;
        return `${i + 1}. [${typeLabel} / ${diffLabel}] ${q.content}`;
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${role.replace(/\s+/g, "_")}_questions.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden
      />

      {showDropZone && (
        <DropZoneModal
          isVi={isVi}
          mp={mp}
          fileInputRef={fileInputRef}
          onFile={(file) => processFile(file)}
          onCancel={() => setShowDropZone(false)}
          onDownloadTemplate={() => downloadExcelTemplate(isVi)}
        />
      )}

      {pendingImport && (
        <ConfirmImportModal
          count={pendingImport.length}
          isVi={isVi}
          mp={mp}
          onAppend={() => commitImport("append")}
          onReplace={() => commitImport("replace")}
          onCancel={() => setPendingImport(null)}
        />
      )}

      <div className="animate-fade-up space-y-6 pb-28">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className={cn("text-2xl font-bold", portalHeading)}>{mp.heading}</h2>
            <p className={cn("text-sm mt-1 max-w-xl", portalSubtext)}>{mp.subtext}</p>
          </div>
          <Link
            href="/hr/generate"
            className="inline-flex items-center gap-2 self-start rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary/40 transition-colors shadow-sm shrink-0"
          >
            <ArrowLeft size={14} />
            <span>{mp.backToAi}</span>
          </Link>
        </div>

        {/* Info card */}
        <div className={cn(portalCard, "p-5 space-y-4")}>
          <div>
            <h3 className={cn("text-sm font-semibold", portalHeading)}>{mp.setInfoCard.title}</h3>
            <p className={cn("text-xs mt-0.5", portalSubtext)}>{mp.setInfoCard.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3">
            <div>
              <label htmlFor={roleId} className={cn("mb-1.5 block text-xs font-medium", portalSubtext)}>
                {mp.setInfoCard.roleLabel} <span className="text-red-500">*</span>
              </label>
              <input
                id={roleId}
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder={mp.setInfoCard.rolePlaceholder}
                className={cn(
                  portalInput,
                  "w-full rounded-lg px-3 py-2 text-sm outline-none transition",
                  roleError
                    ? "border-red-400 dark:border-red-600 focus:ring-2 focus:ring-red-400/20"
                    : "focus:border-primary focus:ring-2 focus:ring-primary/20",
                )}
                aria-invalid={roleError}
              />
              {roleError && <p className="mt-1 text-xs text-red-500">{mp.validation.roleRequired}</p>}
            </div>

            <div className="sm:w-36">
              <label htmlFor={levelId} className={cn("mb-1.5 block text-xs font-medium", portalSubtext)}>
                {mp.setInfoCard.levelLabel}
              </label>
              <div className="relative">
                <select
                  id={levelId}
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className={cn(portalInput, "w-full appearance-none rounded-lg px-3 py-2 pr-8 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20")}
                >
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="sm:w-40">
              <label htmlFor={durationId} className={cn("mb-1.5 block text-xs font-medium", portalSubtext)}>
                {mp.setInfoCard.durationLabel}
              </label>
              <div className="relative">
                <input
                  id={durationId}
                  type="number"
                  min={15}
                  max={240}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(Math.max(15, Number(e.target.value)))}
                  className={cn(portalInput, "w-full rounded-lg px-3 py-2 pr-12 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 tabular-nums")}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">
                  {mp.setInfoCard.durationUnit}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Questions section */}
        <div className="space-y-3">

          {/* Section header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <h3 className={cn("text-sm font-semibold", portalHeading)}>{mp.questionsSection.title}</h3>
              {totalCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary tabular-nums">
                  {filledCount}&thinsp;/&thinsp;{totalCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowDropZone(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 hover:border-green-400 dark:hover:border-green-600 transition-colors"
              >
                <Upload size={12} />
                {mp.excel.importBtn}
              </button>
              <button
                type="button"
                onClick={() => downloadExcelTemplate(isVi)}
                title={mp.excel.downloadTemplate}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <FileSpreadsheet size={12} />
                {mp.excel.downloadTemplate}
              </button>
              {totalCount > 0 && (
                <button
                  type="button"
                  onClick={addQuestion}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus size={12} />
                  {mp.questionsSection.addBtn}
                </button>
              )}
            </div>
          </div>

          {/* Format hint */}
          <p className={cn("text-[11px] flex items-center gap-1", portalSubtext)}>
            <FileSpreadsheet size={11} className="shrink-0" />
            {mp.excel.formatHint}
          </p>

          {/* Empty state */}
          {totalCount === 0 && (
            <div className={cn(
              portalCard,
              "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
              noQuestions && "border-red-300 dark:border-red-700",
            )}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400">
                <ListPlus size={22} />
              </div>
              <div>
                <p className={cn("text-sm font-medium", portalHeading)}>{mp.questionsSection.emptyTitle}</p>
                <p className={cn("text-xs mt-1", portalSubtext)}>{mp.questionsSection.emptyDesc}</p>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={addQuestion}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
                >
                  <Plus size={14} />
                  {mp.questionsSection.addFirstBtn}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDropZone(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-2.5 text-sm font-semibold text-green-700 dark:text-green-400 hover:border-green-400 transition-colors"
                >
                  <Upload size={14} />
                  {mp.excel.importBtn}
                </button>
              </div>
              {noQuestions && <p className="text-xs text-red-500 mt-0.5">{mp.validation.questionsRequired}</p>}
            </div>
          )}

          {/* Question cards */}
          {totalCount > 0 && (
            <div className="space-y-2.5">
              {pageItems.map((q, localIdx) => (
                <QuestionCard
                  key={q.id}
                  index={pageStart + localIdx}
                  question={q}
                  isVi={isVi}
                  mp={mp}
                  hasError={questionHasError(q)}
                  onChange={(patch) => patchQuestion(q.id, patch)}
                  onDelete={() => removeQuestion(q.id)}
                  onClone={() => cloneQuestion(q.id)}
                  canDelete={totalCount > 1}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={activePage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label={isVi ? "Trang trước" : "Previous page"}
              >
                <ChevronLeft size={14} />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                      p === activePage
                        ? "bg-primary text-white shadow-sm"
                        : "border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary",
                    )}
                    aria-current={p === activePage ? "page" : undefined}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={activePage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label={isVi ? "Trang sau" : "Next page"}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Dashed add */}
          {totalCount > 0 && (
            <button
              type="button"
              onClick={addQuestion}
              className="flex items-center gap-2 w-full rounded-xl border border-dashed border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-400 dark:text-gray-500 hover:border-primary hover:text-primary transition-colors justify-center"
            >
              <Plus size={15} />
              {mp.questionsSection.addBtn}
            </button>
          )}

          <div ref={listEndRef} />
        </div>

        {/* Sticky footer */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-62.5 z-40 px-4 sm:px-6 py-4">
          <div className="max-w-350 mx-auto flex items-center justify-between gap-3">
            <p className={cn("text-xs hidden sm:block", portalSubtext)}>
              {filledCount > 0
                ? `${filledCount} ${mp.questionsSection.countSuffix}`
                : <span className="text-gray-400">—</span>
              }
            </p>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Download size={13} />
                {mp.actions.exportTxt}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover disabled:opacity-60 transition-colors"
              >
                {saving ? (
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <BookOpen size={13} />
                )}
                {saving ? mp.actions.saving : mp.actions.save}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Question card ─────────────────────────────────────────────────────────────

interface QuestionCardProps {
  index: number;
  question: ManualQuestion;
  isVi: boolean;
  mp: ReturnType<typeof useLanguage>["t"]["manualPage"];
  hasError: boolean;
  onChange: (patch: Partial<ManualQuestion>) => void;
  onDelete: () => void;
  onClone: () => void;
  canDelete: boolean;
}

function QuestionCard({ index, question, isVi, mp, hasError, onChange, onDelete, onClone, canDelete }: QuestionCardProps) {
  const typeInfo = QUESTION_TYPES.find((t) => t.value === question.type);

  return (
    <div className={cn(
      "group rounded-xl border bg-white dark:bg-gray-900 transition-colors",
      hasError
        ? "border-red-300 dark:border-red-700"
        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
    )}>
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
        <GripVertical size={14} className="text-gray-300 dark:text-gray-600 cursor-grab shrink-0" aria-hidden />
        <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0", typeInfo?.color)}>
          {isVi ? typeInfo?.labelVi : typeInfo?.labelEn}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClone}
          title={mp.questionsSection.cloneBtn}
          aria-label={mp.questionsSection.cloneBtn}
          className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <Copy size={12} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          title={mp.questionsSection.deleteBtn}
          aria-label={mp.questionsSection.deleteBtn}
          className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-400 disabled:pointer-events-none disabled:opacity-30 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        <textarea
          value={question.content}
          onChange={(e) => onChange({ content: e.target.value })}
          rows={2}
          placeholder={mp.questionsSection.questionPlaceholder}
          className={cn(
            "w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none transition",
            hasError
              ? "border-red-300 dark:border-red-600 focus:ring-2 focus:ring-red-400/20"
              : "border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20",
            "bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500",
          )}
          aria-invalid={hasError}
        />
        {hasError && <p className="text-xs text-red-500 -mt-1">{mp.validation.questionContentRequired}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={question.type}
              onChange={(e) => onChange({ type: e.target.value as QuestionType })}
              aria-label={isVi ? "Loại câu hỏi" : "Question type"}
              className={cn("appearance-none rounded-full border-0 px-3 py-1 pr-6 text-[11px] font-semibold outline-none cursor-pointer transition", typeInfo?.color ?? "bg-gray-100 text-gray-600")}
            >
              {QUESTION_TYPES.map((ty) => (
                <option key={ty.value} value={ty.value}>{isVi ? ty.labelVi : ty.labelEn}</option>
              ))}
            </select>
            <ChevronDown size={9} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-60" />
          </div>

          <div className="relative">
            <select
              value={question.difficulty}
              onChange={(e) => onChange({ difficulty: e.target.value as Difficulty })}
              aria-label={isVi ? "Độ khó" : "Difficulty"}
              className="appearance-none rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1 pr-6 text-[11px] font-medium text-gray-600 dark:text-gray-300 outline-none cursor-pointer transition hover:border-gray-300 dark:hover:border-gray-600"
            >
              {DIFFICULTY_OPTS.map((d) => (
                <option key={d.value} value={d.value}>{isVi ? d.labelVi : d.labelEn}</option>
              ))}
            </select>
            <ChevronDown size={9} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
