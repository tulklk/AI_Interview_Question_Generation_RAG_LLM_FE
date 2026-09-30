"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import { Download, Loader2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import {
  getCoachKnowledgeSourceView,
  type CoachKnowledgeView,
} from "@/features/candidate/services/coach.service";

type Props = {
  documentId: string;
  title?: string | null;
  onClose: () => void;
};

/** SCRUM-486: modal xem nguồn KB (md/pdf/docx) trong Coach roadmap. */
export function CoachSourceViewerModal({ documentId, title, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<CoachKnowledgeView | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getCoachKnowledgeSourceView(documentId)
      .then((data) => {
        if (!cancelled) setView(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Không tải được tài liệu.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close backdrop"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="min-w-0">
            <p className={cn("text-sm font-semibold truncate", portalHeading)}>
              {title || view?.sourceTitle || view?.fileName || "Tài liệu nguồn"}
            </p>
            {view?.fileName ? (
              <p className={cn("text-[11px] truncate", portalSubtext)}>{view.fileName}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={22} className="animate-spin text-violet-500" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : view?.contentType === "markdown" || view?.contentType === "text" ? (
            <article className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {view.contentType === "markdown" ? (
                <ReactMarkdown>{view.content ?? ""}</ReactMarkdown>
              ) : (
                <pre className="whitespace-pre-wrap text-sm font-sans">{view.content}</pre>
              )}
            </article>
          ) : view?.contentType === "pdf" && view.url ? (
            <iframe
              title={view.fileName}
              src={view.url}
              className="w-full h-[65vh] rounded-lg border border-gray-200 dark:border-gray-800"
            />
          ) : view?.contentType === "docx" ? (
            <div className="space-y-3">
              {view.url ? (
                <a
                  href={view.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700"
                >
                  <Download size={14} />
                  Tải file DOCX
                </a>
              ) : null}
              {view.previewText ? (
                <pre className={cn("text-xs whitespace-pre-wrap rounded-lg border p-3", portalSubtext)}>
                  {view.previewText}
                </pre>
              ) : (
                <p className={cn("text-sm", portalSubtext)}>
                  Trình duyệt không xem trực tiếp DOCX — hãy tải file về.
                </p>
              )}
            </div>
          ) : (
            <p className={cn("text-sm", portalSubtext)}>Không có nội dung để hiển thị.</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
