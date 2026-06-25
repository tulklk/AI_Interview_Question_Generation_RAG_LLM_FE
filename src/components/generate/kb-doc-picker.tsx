"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, CheckCircle2, Loader2, FolderOpen, Plus, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { getHrKnowledgeDocs } from "@/lib/api/knowledge";
import type { KnowledgeDocument } from "@/types/knowledge";
import { portalHeading, portalSubtext } from "@/lib/portal-ui";
import { useLanguage } from "@/context/language-context";

interface KbDocPickerProps {
  selectedDocId: string | null;
  onSelect: (doc: KnowledgeDocument | null) => void;
}

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function KbDocPicker({ selectedDocId, onSelect }: KbDocPickerProps) {
  const { t } = useLanguage();
  const kb = t.generatePage.kbDocPicker;

  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getHrKnowledgeDocs().then((all) => {
      if (cancelled) return;
      setDocs(all.filter((d) => d.status === "READY"));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleClick = (doc: KnowledgeDocument) => {
    if (selectedDocId === doc.id) {
      onSelect(null);
    } else {
      onSelect(doc);
    }
  };

  return (
    <div className="hr-glass-card p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen size={15} className="text-[#7C3AED] dark:text-[#a78bff]" />
          <span className={cn("text-sm font-semibold", portalHeading)}>
            {kb.title}
          </span>
          <span className={cn("text-xs", portalSubtext)}>{kb.optional}</span>
        </div>
        <Link
          href="/hr/knowledge"
          target="_blank"
          className="flex items-center gap-1 text-xs text-[#7C3AED] dark:text-[#a78bff] hover:underline font-medium"
        >
          <Plus size={12} />
          {kb.addDocument}
          <ExternalLink size={11} />
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={18} className="animate-spin text-[#7C3AED] dark:text-[#a78bff]" />
        </div>
      )}

      {/* Empty state */}
      {!loading && docs.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <FolderOpen size={18} className="text-gray-400 dark:text-gray-500" />
          </div>
          <div>
            <p className={cn("text-sm font-medium", portalHeading)}>{kb.emptyTitle}</p>
            <p className={cn("text-xs mt-0.5", portalSubtext)}>{kb.emptyDesc}</p>
          </div>
          <Link
            href="/hr/knowledge"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary-hover transition-colors"
          >
            <Plus size={13} />
            {kb.uploadToKb}
          </Link>
        </div>
      )}

      {/* Document list */}
      {!loading && docs.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {docs.map((doc) => {
            const isSelected = selectedDocId === doc.id;
            const ext = doc.fileName.split(".").pop()?.toUpperCase() ?? "FILE";
            const size = formatSize(doc.fileSize);

            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => handleClick(doc)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 border",
                  isSelected
                    ? "border-[#7C3AED] bg-[rgba(124,58,237,0.06)] dark:bg-[rgba(124,58,237,0.12)]"
                    : "border-transparent bg-gray-50 dark:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-white dark:hover:bg-gray-800"
                )}
              >
                {/* File icon */}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  isSelected
                    ? "bg-[rgba(124,58,237,0.15)] dark:bg-[rgba(124,58,237,0.2)]"
                    : "bg-white dark:bg-gray-700"
                )}>
                  <FileText
                    size={15}
                    className={isSelected ? "text-[#7C3AED] dark:text-[#a78bff]" : "text-gray-400 dark:text-gray-500"}
                  />
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isSelected ? "text-[#7C3AED] dark:text-[#a78bff]" : portalHeading
                  )}>
                    {doc.fileName}
                  </p>
                  <p className={cn("text-xs mt-0.5 flex items-center gap-1.5", portalSubtext)}>
                    <span className="font-medium">{ext}</span>
                    {size && <><span>·</span><span>{size}</span></>}
                    {doc.pageCount && <><span>·</span><span>{doc.pageCount} {kb.pages}</span></>}
                  </p>
                </div>

                {/* Check indicator */}
                {isSelected ? (
                  <CheckCircle2 size={16} className="text-[#7C3AED] dark:text-[#a78bff] shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-200 dark:border-gray-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Footer hint */}
      {!loading && docs.length > 0 && (
        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
          <p className={cn("text-xs", portalSubtext)}>
            {selectedDocId ? kb.hintSelected : kb.hintNone}
          </p>
          <Link
            href="/hr/knowledge"
            className={cn("text-xs hover:underline flex items-center gap-1", "text-[#7C3AED] dark:text-[#a78bff]")}
          >
            {kb.manageKb}
            <ExternalLink size={11} />
          </Link>
        </div>
      )}
    </div>
  );
}
