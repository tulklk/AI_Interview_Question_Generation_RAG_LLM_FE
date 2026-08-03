"use client";

import { useState, useId } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  GripVertical,
  PenLine,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { portalCard } from "@/shared/utils/portal-ui";

type QuestionType = "Technical" | "Behavioral" | "Situational" | "System-design" | "Problem-solving";
type Difficulty   = "Easy" | "Medium" | "Hard";

interface ManualQuestion {
  id: string;
  content: string;
  type: QuestionType;
  difficulty: Difficulty;
}

const QUESTION_TYPES: { value: QuestionType; labelVi: string; labelEn: string; color: string }[] = [
  { value: "Technical",        labelVi: "Kỹ thuật",       labelEn: "Technical",       color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "Behavioral",       labelVi: "Hành vi",        labelEn: "Behavioral",      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  { value: "Situational",      labelVi: "Tình huống",     labelEn: "Situational",     color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  { value: "System-design",    labelVi: "System design",  labelEn: "System design",   color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
  { value: "Problem-solving",  labelVi: "Giải quyết vấn đề", labelEn: "Problem-solving", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
];

const DIFFICULTY_OPTS: { value: Difficulty; labelVi: string; labelEn: string; dot: string }[] = [
  { value: "Easy",   labelVi: "Dễ",    labelEn: "Easy",   dot: "bg-emerald-500" },
  { value: "Medium", labelVi: "Vừa",   labelEn: "Medium", dot: "bg-amber-500"   },
  { value: "Hard",   labelVi: "Khó",   labelEn: "Hard",   dot: "bg-red-500"     },
];

const LEVELS = [
  { vi: "Intern",    en: "Intern"    },
  { vi: "Junior",    en: "Junior"    },
  { vi: "Mid-level", en: "Mid-level" },
  { vi: "Senior",    en: "Senior"    },
  { vi: "Lead",      en: "Lead"      },
  { vi: "Manager",   en: "Manager"   },
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function makeDefault(): ManualQuestion {
  return { id: uid(), content: "", type: "Technical", difficulty: "Medium" };
}

export function ManualQuestionCreator() {
  const { lang } = useLanguage();
  const { addToast } = useToast();
  const isVi = lang === "vi";

  const [open,       setOpen]       = useState(false);
  const [role,       setRole]       = useState("");
  const [level,      setLevel]      = useState("Mid-level");
  const [duration,   setDuration]   = useState(60);
  const [questions,  setQuestions]  = useState<ManualQuestion[]>([makeDefault(), makeDefault(), makeDefault()]);
  const [saving,     setSaving]     = useState(false);

  const roleId     = useId();
  const levelId    = useId();
  const durationId = useId();

  function addQuestion() {
    setQuestions((prev) => [...prev, makeDefault()]);
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function patchQuestion(id: string, patch: Partial<ManualQuestion>) {
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, ...patch } : q));
  }

  function handleSave() {
    const filled = questions.filter((q) => q.content.trim());
    if (!role.trim()) {
      addToast("error", isVi ? "Vui lòng nhập vị trí ứng tuyển." : "Please enter the job title.");
      return;
    }
    if (filled.length === 0) {
      addToast("error", isVi ? "Vui lòng thêm ít nhất 1 câu hỏi." : "Please add at least 1 question.");
      return;
    }
    setSaving(true);
    // Dummy save — simulate a short delay then success
    setTimeout(() => {
      setSaving(false);
      addToast("success", isVi
        ? `Đã lưu bộ câu hỏi "${role}" (${filled.length} câu).`
        : `Saved question set "${role}" (${filled.length} questions).`
      );
    }, 800);
  }

  function handleExport() {
    const filled = questions.filter((q) => q.content.trim());
    if (!role.trim() || filled.length === 0) {
      addToast("error", isVi ? "Nhập vị trí và ít nhất 1 câu hỏi trước khi xuất." : "Enter a role and at least 1 question before exporting.");
      return;
    }
    // Dummy export as plain text
    const lines = [
      `${isVi ? "Bộ câu hỏi phỏng vấn" : "Interview Question Set"}: ${role} — ${level}`,
      `${isVi ? "Thời lượng" : "Duration"}: ${duration} ${isVi ? "phút" : "min"}`,
      "",
      ...filled.map((q, i) => {
        const typeLabel = QUESTION_TYPES.find((t) => t.value === q.type)?.[isVi ? "labelVi" : "labelEn"] ?? q.type;
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

  const filledCount = questions.filter((q) => q.content.trim()).length;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm animate-fade-up">
      {/* Left accent bar + header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group w-full flex items-center gap-0 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        {/* Purple accent strip */}
        <div className={cn("w-1 self-stretch shrink-0 rounded-l-xl transition-colors", open ? "bg-primary" : "bg-gray-200 dark:bg-gray-700 group-hover:bg-primary/40")} />

        <div className="flex flex-1 items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-colors", open ? "bg-primary/10 text-primary" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-primary/10 group-hover:text-primary")}>
              <PenLine size={15} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {isVi ? "Tạo câu hỏi thủ công" : "Create manually"}
                </span>
                <span className="hidden sm:inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {isVi ? "Không cần AI" : "No AI"}
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                {isVi ? "Soạn câu hỏi theo cấu trúc chuẩn — tải về hoặc lưu ngay." : "Write structured questions — export or save instantly."}
              </p>
            </div>
          </div>

          {/* Right: stats + chevron */}
          <div className="flex items-center gap-2.5 shrink-0">
            {open && filledCount > 0 && (
              <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-semibold">
                {filledCount} / {questions.length} {isVi ? "câu" : "q"}
              </span>
            )}
            <div className={cn("flex h-6 w-6 items-center justify-center rounded-full transition-colors", open ? "bg-primary/10 text-primary" : "text-gray-400 dark:text-gray-500")}>
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>
        </div>
      </button>

      {open && <>
      {/* Meta fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-5 py-4 border-t border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/40 dark:bg-gray-800/20">
        <div className="sm:col-span-1">
          <label htmlFor={roleId} className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
            {isVi ? "Vị trí ứng tuyển" : "Job title"} <span className="text-red-500">*</span>
          </label>
          <input
            id={roleId}
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder={isVi ? "Ví dụ: Frontend Developer" : "e.g. Frontend Developer"}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          />
        </div>
        <div>
          <label htmlFor={levelId} className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
            {isVi ? "Cấp độ" : "Level"}
          </label>
          <div className="relative">
            <select
              id={levelId}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 pr-8 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            >
              {LEVELS.map((l) => (
                <option key={l.en} value={l.en}>{isVi ? l.vi : l.en}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        <div>
          <label htmlFor={durationId} className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
            {isVi ? "Thời lượng phỏng vấn" : "Interview duration"}
          </label>
          <div className="relative flex items-center">
            <input
              id={durationId}
              type="number"
              min={15}
              max={240}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Math.max(15, Number(e.target.value)))}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 pr-14 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition tabular-nums"
            />
            <span className="pointer-events-none absolute right-3 text-xs text-gray-400 dark:text-gray-500">
              {isVi ? "phút" : "min"}
            </span>
          </div>
        </div>
      </div>

      {/* Question list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {questions.map((q, idx) => (
          <QuestionRow
            key={q.id}
            index={idx}
            question={q}
            isVi={isVi}
            onChange={(patch) => patchQuestion(q.id, patch)}
            onDelete={() => removeQuestion(q.id)}
            canDelete={questions.length > 1}
          />
        ))}
      </div>

      {/* Add button */}
      <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary transition-colors w-full justify-center"
        >
          <Plus size={15} />
          {isVi ? "Thêm câu hỏi" : "Add question"}
        </button>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 rounded-b-xl">

        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Download size={14} />
          {isVi ? "Xuất file .txt" : "Export .txt"}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover disabled:opacity-60 transition-colors"
        >
          {saving ? (
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <BookOpen size={14} />
          )}
          {saving
            ? (isVi ? "Đang lưu…" : "Saving…")
            : (isVi ? "Lưu bộ câu hỏi" : "Save question set")}
        </button>
      </div>
      </>}
    </div>
  );
}

// ── Individual question row ────────────────────────────────────────────────────

interface QuestionRowProps {
  index: number;
  question: ManualQuestion;
  isVi: boolean;
  onChange: (patch: Partial<ManualQuestion>) => void;
  onDelete: () => void;
  canDelete: boolean;
}

function QuestionRow({ index, question, isVi, onChange, onDelete, canDelete }: QuestionRowProps) {
  const typeInfo = QUESTION_TYPES.find((t) => t.value === question.type);
  const diffInfo = DIFFICULTY_OPTS.find((d) => d.value === question.difficulty);

  return (
    <div className="group flex gap-3 px-5 py-4 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
      {/* Drag handle + number */}
      <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
        <GripVertical size={13} className="text-gray-300 dark:text-gray-600 cursor-grab" />
        <span className="text-[11px] font-bold text-gray-300 dark:text-gray-600 tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-2">
        <textarea
          value={question.content}
          onChange={(e) => onChange({ content: e.target.value })}
          rows={2}
          placeholder={isVi
            ? `Câu hỏi ${index + 1}…`
            : `Question ${index + 1}…`}
          className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
        />

        {/* Type + Difficulty */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type select */}
          <div className="relative">
            <select
              value={question.type}
              onChange={(e) => onChange({ type: e.target.value as QuestionType })}
              className={cn(
                "appearance-none rounded-full border-0 px-3 py-1 pr-6 text-[11px] font-semibold outline-none cursor-pointer transition",
                typeInfo?.color ?? "bg-gray-100 text-gray-600"
              )}
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {isVi ? t.labelVi : t.labelEn}
                </option>
              ))}
            </select>
            <ChevronDown size={10} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-60" />
          </div>

          {/* Difficulty select */}
          <div className="relative">
            <select
              value={question.difficulty}
              onChange={(e) => onChange({ difficulty: e.target.value as Difficulty })}
              className="appearance-none rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1 pr-6 text-[11px] font-medium text-gray-600 dark:text-gray-300 outline-none cursor-pointer transition hover:border-gray-300 dark:hover:border-gray-600"
            >
              {DIFFICULTY_OPTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {isVi ? d.labelVi : d.labelEn}
                </option>
              ))}
            </select>
            <ChevronDown size={10} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

        </div>
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        disabled={!canDelete}
        className="mt-1 shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-400 disabled:pointer-events-none transition-all"
        aria-label={isVi ? "Xóa câu hỏi" : "Delete question"}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
