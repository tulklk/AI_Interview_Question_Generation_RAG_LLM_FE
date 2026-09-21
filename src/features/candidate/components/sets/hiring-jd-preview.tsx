"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, ExternalLink, FileText, ImageIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalDivider, portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

type Props = {
  jobDescription?: string | null;
  jdSourceType?: string | null;
  jdOriginalFileName?: string | null;
  jdFileUrl?: string | null;
  className?: string;
};

const COLLAPSE_CHARS = 480;

function isImageFile(name?: string | null, url?: string | null): boolean {
  const s = `${name ?? ""} ${url ?? ""}`.toLowerCase();
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(s);
}

/**
 * SCRUM-465: candidate xem bản JD ngắn + preview ảnh / tải file gốc khi bộ Tuyển.
 */
export function HiringJdPreview({
  jobDescription,
  jdSourceType,
  jdOriginalFileName,
  jdFileUrl,
  className,
}: Props) {
  const { t } = useLanguage();
  const h = t.hiringMode;
  const text = jobDescription?.trim() ?? "";
  const hasText = text.length > 0;
  const hasFile = Boolean(jdFileUrl?.trim());
  const fromFile =
    jdSourceType === "UploadedFile" || Boolean(jdOriginalFileName?.trim()) || hasFile;
  const showImage = hasFile && isImageFile(jdOriginalFileName, jdFileUrl);
  const [expanded, setExpanded] = useState(false);

  const needsCollapse = text.length > COLLAPSE_CHARS;
  const displayText = useMemo(() => {
    if (!needsCollapse || expanded) return text;
    return `${text.slice(0, COLLAPSE_CHARS).trimEnd()}…`;
  }, [expanded, needsCollapse, text]);

  if (!hasText && !hasFile) return null;

  const ext = (() => {
    const n = jdOriginalFileName?.trim() ?? "";
    if (!n.includes(".")) return "FILE";
    return n.split(".").pop()!.toUpperCase().slice(0, 5);
  })();

  return (
    <div className={cn("overflow-hidden", className)}>
      <div className={cn("px-5 py-3.5 border-b", portalDivider)}>
        <p className={cn("text-[14px] font-bold", portalHeadingAlt)}>
          {h.candidateJdTitle}
        </p>
        <p className={cn("mt-0.5 text-[11px]", portalSubtextAlt)}>{h.candidateJdSub}</p>
      </div>

      <div className="space-y-3 px-5 py-4">
        {fromFile && hasFile && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/50">
            <div className="flex flex-wrap items-center gap-2">
              {showImage ? (
                <ImageIcon size={14} className="text-primary" />
              ) : (
                <FileText size={14} className="text-primary" />
              )}
              <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold dark:bg-gray-800">
                {ext}
              </span>
              <span className={cn("min-w-0 flex-1 truncate text-xs font-medium", portalHeadingAlt)}>
                {jdOriginalFileName?.trim() || h.publicJdFileFallback}
              </span>
              <a
                href={jdFileUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                {showImage ? <ExternalLink size={12} /> : <Download size={12} />}
                {showImage ? h.publicJdOpenImage : h.publicJdDownload}
              </a>
            </div>
            {showImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={jdFileUrl!}
                alt={jdOriginalFileName ?? "JD"}
                className="mt-2 max-h-56 w-full rounded-lg border border-gray-200 object-contain dark:border-gray-700"
              />
            )}
          </div>
        )}

        {hasText && (
          <div>
            <p className={cn("whitespace-pre-wrap text-[13px] leading-relaxed", portalSubtextAlt)}>
              {displayText}
            </p>
            {needsCollapse && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
              >
                {expanded ? (
                  <>
                    <ChevronUp size={14} />
                    {h.candidateJdCollapse}
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    {h.candidateJdExpand}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
