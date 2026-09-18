"use client";

import { useRef } from "react";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import type { CvInfo } from "@/features/candidate/services/candidate-cv.service";

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
    <div className="hr-glass-card px-5 py-6 space-y-3">
      <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.phaseCvTitle}</p>
      <p className={cn("text-[12px]", portalSubtextAlt)}>{p.phaseCvDesc}</p>
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
        className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-[12px] font-semibold bg-primary text-white disabled:opacity-50"
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {p.uploadCvHere}
      </button>
    </div>
  );
}
