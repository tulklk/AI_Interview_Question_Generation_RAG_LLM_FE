"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, FileText, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalCard, portalHeading, portalInput, portalSubtext } from "@/shared/utils/portal-ui";
import {
  setQuestionSetHiringPosting,
  setQuestionSetPublicJobDescription,
  type HiringPostingPayload,
} from "@/features/interview/services/interview.service";
import { useToast } from "@/shared/providers/toast-context";

export type HiringPostingDraft = {
  jobLocation: string;
  workplaceType: "AtOffice" | "Hybrid" | "Remote" | "";
  salaryMin: string;
  salaryMax: string;
  salaryNegotiable: boolean;
  jobExpertise: string;
  jobDomain: string;
};

export type HiringPostingSaved = {
  jobLocation: string;
  workplaceType: "AtOffice" | "Hybrid" | "Remote" | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNegotiable: boolean;
  jobExpertise: string;
  jobDomain: string;
};

/** Input khởi tạo panel — cho phép null từ draft API. */
export type HiringPostingInitial = {
  jobLocation?: string | null;
  workplaceType?: "AtOffice" | "Hybrid" | "Remote" | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryNegotiable?: boolean;
  jobExpertise?: string | null;
  jobDomain?: string | null;
};

type Props = {
  questionSetId: string;
  fullJobDescription?: string | null;
  initialPublicJobDescription?: string | null;
  initialPosting?: HiringPostingInitial | null;
  jdSourceType?: "PastedText" | "UploadedFile" | null;
  jdOriginalFileName?: string | null;
  jdFileUrl?: string | null;
  onSaved?: (publicJobDescription: string, posting: HiringPostingSaved) => void;
  /** Highlight khi HR bật Tuyển nhưng chưa lưu bản ngắn / posting. */
  needsAttention?: boolean;
  onAttentionCleared?: () => void;
  /** Text JD đang soạn (kể cả chưa lưu). */
  onDraftChange?: (text: string) => void;
  /** Text posting đang soạn — để bật Tuyển / publish tự lưu. */
  onPostingDraftChange?: (draft: HiringPostingDraft) => void;
  className?: string;
};

function isImageFile(name?: string | null, url?: string | null): boolean {
  const s = `${name ?? ""} ${url ?? ""}`.toLowerCase();
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(s);
}

function postingFromInitial(initial?: HiringPostingInitial | null): HiringPostingDraft {
  return {
    jobLocation: initial?.jobLocation?.trim() ?? "",
    workplaceType: initial?.workplaceType ?? "",
    salaryMin: initial?.salaryMin != null ? String(initial.salaryMin) : "",
    salaryMax: initial?.salaryMax != null ? String(initial.salaryMax) : "",
    salaryNegotiable: initial?.salaryNegotiable ?? true,
    jobExpertise: initial?.jobExpertise?.trim() ?? "",
    jobDomain: initial?.jobDomain?.trim() ?? "",
  };
}

function parseSalary(raw: string): number | null {
  const n = Number(raw.replace(/[,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** Validate draft posting — null = OK, string = i18n key suffix / message. */
export function validateHiringPostingDraft(d: HiringPostingDraft): string | null {
  if (!d.jobLocation.trim()) return "postingLocationRequired";
  if (!d.jobExpertise.trim()) return "postingExpertiseRequired";
  if (!d.jobDomain.trim()) return "postingDomainRequired";
  if (!d.salaryNegotiable) {
    const min = parseSalary(d.salaryMin);
    const max = parseSalary(d.salaryMax);
    if (min == null && max == null) return "postingSalaryRequired";
    if (min != null && max != null && max < min) return "postingSalaryRangeInvalid";
  }
  return null;
}

export function postingDraftToPayload(d: HiringPostingDraft): HiringPostingPayload {
  return {
    jobLocation: d.jobLocation.trim(),
    workplaceType: d.workplaceType || null,
    salaryMin: d.salaryNegotiable ? null : parseSalary(d.salaryMin),
    salaryMax: d.salaryNegotiable ? null : parseSalary(d.salaryMax),
    salaryNegotiable: d.salaryNegotiable,
    jobExpertise: d.jobExpertise.trim(),
    jobDomain: d.jobDomain.trim(),
  };
}

/**
 * SCRUM-465 + SCRUM-468: JD ngắn + metadata tin tuyển cho candidate.
 */
export function PublicJdEditorPanel({
  questionSetId,
  fullJobDescription,
  initialPublicJobDescription,
  initialPosting = null,
  jdSourceType,
  jdOriginalFileName,
  jdFileUrl,
  onSaved,
  needsAttention = false,
  onAttentionCleared,
  onDraftChange,
  onPostingDraftChange,
  className,
}: Props) {
  const { t } = useLanguage();
  const h = t.hiringMode;
  const { addToast } = useToast();
  const [text, setText] = useState(initialPublicJobDescription?.trim() ?? "");
  const [posting, setPosting] = useState<HiringPostingDraft>(() => postingFromInitial(initialPosting));
  const [saving, setSaving] = useState(false);
  const [didPrefill, setDidPrefill] = useState(false);

  useEffect(() => {
    setText(initialPublicJobDescription?.trim() ?? "");
    setPosting(postingFromInitial(initialPosting));
  }, [initialPublicJobDescription, initialPosting, questionSetId]);

  useEffect(() => {
    onDraftChange?.(text);
  }, [text, onDraftChange]);

  useEffect(() => {
    onPostingDraftChange?.(posting);
  }, [posting, onPostingDraftChange]);

  // Prefill 1 lần từ full JD nếu public còn trống (không ghi đè khi HR đã soạn).
  useEffect(() => {
    if (didPrefill) return;
    if (initialPublicJobDescription?.trim()) {
      setDidPrefill(true);
      return;
    }
    const full = fullJobDescription?.trim() ?? "";
    if (!full || full.startsWith("(Studio)")) return;
    setText(full.length > 4000 ? `${full.slice(0, 4000).trimEnd()}…` : full);
    setDidPrefill(true);
  }, [didPrefill, initialPublicJobDescription, fullJobDescription]);

  const initialPostingNorm = postingFromInitial(initialPosting);
  const postingDirty =
    posting.jobLocation !== initialPostingNorm.jobLocation ||
    posting.workplaceType !== initialPostingNorm.workplaceType ||
    posting.salaryMin !== initialPostingNorm.salaryMin ||
    posting.salaryMax !== initialPostingNorm.salaryMax ||
    posting.salaryNegotiable !== initialPostingNorm.salaryNegotiable ||
    posting.jobExpertise !== initialPostingNorm.jobExpertise ||
    posting.jobDomain !== initialPostingNorm.jobDomain;

  const dirty = text.trim() !== (initialPublicJobDescription?.trim() ?? "") || postingDirty;
  const fromFile = jdSourceType === "UploadedFile" || Boolean(jdOriginalFileName?.trim());
  const showImage = Boolean(jdFileUrl) && isImageFile(jdOriginalFileName, jdFileUrl);
  const ext = useMemo(() => {
    const n = jdOriginalFileName?.trim() ?? "";
    if (!n.includes(".")) return "FILE";
    return n.split(".").pop()!.toUpperCase().slice(0, 5);
  }, [jdOriginalFileName]);

  function patchPosting(patch: Partial<HiringPostingDraft>) {
    setPosting((prev) => ({ ...prev, ...patch }));
    if (needsAttention) onAttentionCleared?.();
  }

  async function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) {
      addToast("error", h.publicJdRequired);
      return;
    }
    const errKey = validateHiringPostingDraft(posting);
    if (errKey) {
      const msg =
        errKey === "postingLocationRequired"
          ? h.postingLocationRequired
          : errKey === "postingExpertiseRequired"
            ? h.postingExpertiseRequired
            : errKey === "postingDomainRequired"
              ? h.postingDomainRequired
              : errKey === "postingSalaryRequired"
                ? h.postingSalaryRequired
                : errKey === "postingSalaryRangeInvalid"
                  ? h.postingSalaryRangeInvalid
                  : h.postingIncomplete;
      addToast("error", msg);
      return;
    }
    setSaving(true);
    try {
      const savedJd = await setQuestionSetPublicJobDescription(questionSetId, trimmed);
      const savedPosting = await setQuestionSetHiringPosting(
        questionSetId,
        postingDraftToPayload(posting)
      );
      setText(savedJd.publicJobDescription);
      const next: HiringPostingSaved = {
        jobLocation: savedPosting.jobLocation,
        workplaceType: savedPosting.workplaceType ?? null,
        salaryMin: savedPosting.salaryMin ?? null,
        salaryMax: savedPosting.salaryMax ?? null,
        salaryNegotiable: savedPosting.salaryNegotiable,
        jobExpertise: savedPosting.jobExpertise,
        jobDomain: savedPosting.jobDomain,
      };
      setPosting(postingFromInitial(next));
      onSaved?.(savedJd.publicJobDescription, next);
      onAttentionCleared?.();
      addToast("success", h.publicJdSaveSuccess);
    } catch (err) {
      addToast("error", err instanceof Error && err.message ? err.message : h.publicJdSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  function copyFromFull() {
    const full = fullJobDescription?.trim() ?? "";
    if (!full || full.startsWith("(Studio)")) {
      addToast("error", h.publicJdNoSource);
      return;
    }
    setText(full.length > 4000 ? `${full.slice(0, 4000).trimEnd()}…` : full);
  }

  const fieldCls = cn(
    "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
    portalInput
  );

  return (
    <div
      id="public-jd-editor"
      className={cn(
        portalCard,
        "space-y-3 p-4",
        needsAttention && "ring-2 ring-amber-400 dark:ring-amber-500",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("text-sm font-semibold", portalHeading)}>{h.publicJdTitle}</p>
          <p className={cn("mt-0.5 text-xs leading-snug", portalSubtext)}>{h.publicJdHint}</p>
          {needsAttention && (
            <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              {h.postingIncomplete}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={copyFromFull}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold",
            "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          )}
        >
          <Copy size={12} />
          {h.publicJdCopyFromSource}
        </button>
      </div>

      {fromFile && (
        <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-900/40">
          <div className="flex flex-wrap items-center gap-2">
            {showImage ? (
              <ImageIcon size={14} className="text-primary" />
            ) : (
              <FileText size={14} className="text-primary" />
            )}
            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold dark:bg-gray-800">
              {ext}
            </span>
            <span className={cn("truncate text-xs font-medium", portalHeading)}>
              {jdOriginalFileName?.trim() || h.publicJdFileFallback}
            </span>
            {jdFileUrl && (
              <a
                href={jdFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                <ExternalLink size={12} />
                {showImage ? h.publicJdOpenImage : h.publicJdDownload}
              </a>
            )}
          </div>
          {showImage && jdFileUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={jdFileUrl}
              alt={jdOriginalFileName ?? "JD"}
              className="mt-2 max-h-48 w-full rounded-md border border-gray-200 object-contain dark:border-gray-700"
            />
          )}
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (needsAttention) onAttentionCleared?.();
        }}
        rows={6}
        placeholder={h.publicJdPlaceholder}
        className={cn(
          "w-full resize-y rounded-lg px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          portalInput
        )}
      />

      {/* SCRUM-468: metadata tin tuyển */}
      <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        <p className={cn("text-[11px] font-semibold uppercase tracking-wide", portalSubtext)}>
          {h.postingSectionTitle}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className={cn("text-[11px] font-medium", portalHeading)}>{h.postingLocation}</span>
            <input
              value={posting.jobLocation}
              onChange={(e) => patchPosting({ jobLocation: e.target.value })}
              placeholder={h.postingLocationPlaceholder}
              className={fieldCls}
            />
          </label>
          <label className="block space-y-1">
            <span className={cn("text-[11px] font-medium", portalHeading)}>{h.postingWorkplace}</span>
            <select
              value={posting.workplaceType}
              onChange={(e) =>
                patchPosting({
                  workplaceType: e.target.value as HiringPostingDraft["workplaceType"],
                })
              }
              className={fieldCls}
            >
              <option value="">{h.postingWorkplaceOptional}</option>
              <option value="AtOffice">{h.postingWorkplaceAtOffice}</option>
              <option value="Hybrid">{h.postingWorkplaceHybrid}</option>
              <option value="Remote">{h.postingWorkplaceRemote}</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className={cn("text-[11px] font-medium", portalHeading)}>{h.postingExpertise}</span>
            <input
              value={posting.jobExpertise}
              onChange={(e) => patchPosting({ jobExpertise: e.target.value })}
              placeholder={h.postingExpertisePlaceholder}
              className={fieldCls}
            />
          </label>
          <label className="block space-y-1">
            <span className={cn("text-[11px] font-medium", portalHeading)}>{h.postingDomain}</span>
            <input
              value={posting.jobDomain}
              onChange={(e) => patchPosting({ jobDomain: e.target.value })}
              placeholder={h.postingDomainPlaceholder}
              className={fieldCls}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <label className="inline-flex items-center gap-2 text-[12px] font-medium">
            <input
              type="checkbox"
              checked={posting.salaryNegotiable}
              onChange={(e) => patchPosting({ salaryNegotiable: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className={portalHeading}>{h.postingSalaryNegotiable}</span>
          </label>
        </div>
        {!posting.salaryNegotiable && (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className={cn("text-[11px] font-medium", portalHeading)}>{h.postingSalaryMin}</span>
              <input
                type="number"
                min={1}
                value={posting.salaryMin}
                onChange={(e) => patchPosting({ salaryMin: e.target.value })}
                placeholder="10000000"
                className={fieldCls}
              />
            </label>
            <label className="block space-y-1">
              <span className={cn("text-[11px] font-medium", portalHeading)}>{h.postingSalaryMax}</span>
              <input
                type="number"
                min={1}
                value={posting.salaryMax}
                onChange={(e) => patchPosting({ salaryMax: e.target.value })}
                placeholder="20000000"
                className={fieldCls}
              />
            </label>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn("text-[11px] tabular-nums", portalSubtext)}>
          {text.trim().length.toLocaleString()} / 20,000
        </p>
        <button
          type="button"
          disabled={saving || !dirty || !text.trim()}
          onClick={() => void handleSave()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {h.postingSave}
        </button>
      </div>
    </div>
  );
}
