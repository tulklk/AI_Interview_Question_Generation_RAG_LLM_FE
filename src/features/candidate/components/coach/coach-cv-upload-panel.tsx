"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import type { CvInfo } from "@/features/candidate/services/candidate-cv.service";
import { CoachStepHeader } from "@/features/candidate/components/coach/coach-step-header";

export type CoachOutputLanguage = "English" | "Vietnamese";

const LANGUAGE_OPTIONS: { value: CoachOutputLanguage; label: string }[] = [
  { value: "Vietnamese", label: "Tiếng Việt" },
  { value: "English", label: "English" },
];

interface CoachCvUploadPanelProps {
  cv: CvInfo | null;
  /** Có file CV trên profile / context dù getCv chưa trả metadata đầy đủ. */
  hasExistingCv?: boolean;
  uploading: boolean;
  /** Ngôn ngữ đã lưu — preselect, user vẫn đổi được trước khi tiếp tục. */
  outputLanguage?: CoachOutputLanguage | null;
  onUpload: (file: File, language: CoachOutputLanguage) => Promise<void>;
  /** SCRUM-490: tiếp tục với CV đã có → bước Phân tích. */
  onContinueWithExisting?: (language: CoachOutputLanguage) => void;
}

export function CoachCvUploadPanel({
  cv,
  hasExistingCv = false,
  uploading,
  outputLanguage = null,
  onUpload,
  onContinueWithExisting,
}: CoachCvUploadPanelProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const inputRef = useRef<HTMLInputElement>(null);
  const showReuse = Boolean(cv || hasExistingCv);
  const [language, setLanguage] = useState<CoachOutputLanguage | null>(outputLanguage);
  const [languageError, setLanguageError] = useState(false);

  useEffect(() => {
    if (outputLanguage) setLanguage(outputLanguage);
  }, [outputLanguage]);

  function requireLanguage(): CoachOutputLanguage | null {
    if (!language) {
      setLanguageError(true);
      return null;
    }
    setLanguageError(false);
    return language;
  }

  return (
    <div className="hr-glass-card overflow-hidden">
      <CoachStepHeader
        icon={FileUp}
        title={p.phaseCvTitle}
        subtitle={p.phaseCvDesc}
        iconWrapClassName="bg-sky-100 dark:bg-sky-950/50"
        iconClassName="text-sky-600 dark:text-sky-400"
      />
      <div className="space-y-3 px-5 py-5">
        <div className="space-y-2">
          <p className={cn("text-[12px] font-semibold", portalSubtextAlt)}>{p.cvLanguageTitle}</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((opt) => {
              const selected = language === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={uploading}
                  onClick={() => {
                    setLanguage(opt.value);
                    setLanguageError(false);
                  }}
                  className={cn(
                    "inline-flex h-9 items-center rounded-lg px-3.5 text-[12px] font-semibold disabled:opacity-50",
                    selected
                      ? "bg-primary text-white"
                      : "border border-gray-200 dark:border-gray-700 hover:border-primary/40"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className={cn("text-[11px]", portalSubtextAlt)}>{p.cvLanguageHint}</p>
          {languageError && (
            <p className="text-[11px] font-medium text-red-600 dark:text-red-400">
              {p.cvLanguageRequired}
            </p>
          )}
        </div>
        <p
          className={cn(
            "text-[11px] rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2",
            "dark:border-amber-900/40 dark:bg-amber-950/25 text-amber-900 dark:text-amber-100"
          )}
        >
          {p.cvPrepDisclaimer}
        </p>
        {showReuse && (
          <p className={cn("text-[12px]", portalSubtextAlt)}>
            {cv
              ? p.cvFile.replace("{{name}}", cv.fileName)
              : p.cvExistingOnProfile}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            const chosen = requireLanguage();
            if (file && chosen) void onUpload(file, chosen);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          {showReuse && onContinueWithExisting && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => {
                const chosen = requireLanguage();
                if (chosen) onContinueWithExisting(chosen);
              }}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              {p.continueWithExistingCv}
            </button>
          )}
          <button
            type="button"
            disabled={uploading}
            onClick={() => {
              if (!requireLanguage()) return;
              inputRef.current?.click();
            }}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[12px] font-semibold disabled:opacity-50",
              showReuse
                ? "border border-gray-200 dark:border-gray-700 hover:border-primary/40"
                : "bg-primary text-white"
            )}
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {showReuse ? p.uploadNewCv : p.uploadCvHere}
          </button>
        </div>
      </div>
    </div>
  );
}
