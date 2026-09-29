"use client";

import { useRef } from "react";
import { FileUp, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import type { CvInfo } from "@/features/candidate/services/candidate-cv.service";
import { CoachStepHeader } from "@/features/candidate/components/coach/coach-step-header";

interface CoachCvUploadPanelProps {
  cv: CvInfo | null;
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
}

export function CoachCvUploadPanel({ cv, uploading, onUpload }: CoachCvUploadPanelProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const inputRef = useRef<HTMLInputElement>(null);

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
        <p
          className={cn(
            "text-[11px] rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2",
            "dark:border-amber-900/40 dark:bg-amber-950/25 text-amber-900 dark:text-amber-100"
          )}
        >
          {p.cvPrepDisclaimer}
        </p>
        {cv && (
          <p className={cn("text-[12px]", portalSubtextAlt)}>
            {p.cvFile.replace("{{name}}", cv.fileName)}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onUpload(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-[12px] font-semibold text-white disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {p.uploadCvHere}
        </button>
      </div>
    </div>
  );
}
