"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Check,
  MoreHorizontal,
  Trash2,
  Pencil,
  ExternalLink,
  Plus,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getHrKnowledgeDocs } from "@/lib/api/knowledge";
import type { KnowledgeDocument } from "@/types/knowledge";
import { portalHeading, portalSubtext } from "@/lib/portal-ui";
import { useLanguage } from "@/context/language-context";

interface KbDocPickerProps {
  selectedDocId: string | null;
  onSelect: (doc: KnowledgeDocument | null) => void;
}

export function KbDocPicker({ selectedDocId, onSelect }: KbDocPickerProps) {
  const { t } = useLanguage();
  const kb = t.generatePage.kbDocPicker;

  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openMenuId) return;
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [openMenuId]);

  function toggleDoc(doc: KnowledgeDocument) {
    onSelect(selectedDocId === doc.id ? null : doc);
  }

  function handleSelectAll() {
    if (selectedDocId) {
      onSelect(null);
    } else if (docs.length > 0) {
      onSelect(docs[0]);
    }
  }

  return (
    <div className="hr-glass-card overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen size={14} className="text-[#7C3AED] dark:text-[#a78bff] shrink-0" />
          <span className={cn("text-sm font-semibold truncate", portalHeading)}>{kb.title}</span>
          <span className={cn("text-xs shrink-0", portalSubtext)}>{kb.optional}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {docs.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAll}
              className={cn(
                "flex items-center gap-1 text-xs font-medium transition-colors whitespace-nowrap",
                selectedDocId
                  ? "text-[#7C3AED] dark:text-[#a78bff]"
                  : "text-gray-400 dark:text-gray-500 hover:text-[#7C3AED] dark:hover:text-[#a78bff]"
              )}
            >
              Chọn tất cả
              <Check size={11} strokeWidth={3} className={selectedDocId ? "opacity-100" : "opacity-40"} />
            </button>
          )}

          <Link
            href="/hr/knowledge"
            target="_blank"
            className="flex items-center gap-1 text-xs text-[#7C3AED] dark:text-[#a78bff] hover:underline font-medium whitespace-nowrap"
          >
            <Plus size={11} />
            {kb.addDocument}
          </Link>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={18} className="animate-spin text-[#7C3AED] dark:text-[#a78bff]" />
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && docs.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-8 px-4 text-center">
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

      {/* ── Document list ── */}
      {!loading && docs.length > 0 && (
        <ul className="max-h-52 overflow-y-auto border-t border-gray-100 dark:border-gray-800">
          {docs.map((doc) => {
            const isSelected = selectedDocId === doc.id;
            const menuOpen = openMenuId === doc.id;

            return (
              <li
                key={doc.id}
                className={cn(
                  "group relative flex items-center gap-2.5 px-4 py-2.5 cursor-pointer select-none transition-colors",
                  isSelected
                    ? "bg-[rgba(124,58,237,0.06)] dark:bg-[rgba(124,58,237,0.1)]"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                )}
                onClick={() => toggleDoc(doc)}
              >
                {/* File icon */}
                <FileText
                  size={16}
                  className={cn(
                    "shrink-0 transition-colors",
                    isSelected
                      ? "text-[#7C3AED] dark:text-[#a78bff]"
                      : "text-blue-500 dark:text-blue-400"
                  )}
                />

                {/* Filename */}
                <span
                  className={cn(
                    "flex-1 min-w-0 text-sm truncate",
                    isSelected
                      ? "text-[#7C3AED] dark:text-[#a78bff] font-medium"
                      : portalHeading
                  )}
                  title={doc.fileName}
                >
                  {doc.fileName}
                </span>

                {/* Three-dot menu */}
                <div
                  ref={menuOpen ? menuRef : null}
                  className="relative shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setOpenMenuId(menuOpen ? null : doc.id)}
                    className={cn(
                      "p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200",
                      "hover:bg-gray-100 dark:hover:bg-gray-700 transition-all",
                      menuOpen
                        ? "opacity-100 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200"
                        : "opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <MoreHorizontal size={14} />
                  </button>

                  {/* Dropdown */}
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <button
                        type="button"
                        onClick={() => { onSelect(null); setOpenMenuId(null); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Trash2 size={13} className="text-gray-400" />
                        Xoá nguồn
                      </button>
                      <Link
                        href="/hr/knowledge"
                        target="_blank"
                        onClick={() => setOpenMenuId(null)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Pencil size={13} className="text-gray-400" />
                        Đổi tên nguồn
                        <ExternalLink size={10} className="ml-auto text-gray-300 dark:text-gray-600" />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Checkmark */}
                <Check
                  size={13}
                  strokeWidth={3}
                  className={cn(
                    "shrink-0 transition-opacity",
                    isSelected
                      ? "text-[#7C3AED] dark:text-[#a78bff] opacity-100"
                      : "opacity-0"
                  )}
                />
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Footer ── */}
      {!loading && docs.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-800">
          <p className={cn("text-xs", portalSubtext)}>
            {selectedDocId ? kb.hintSelected : kb.hintNone}
          </p>
          <Link
            href="/hr/knowledge"
            target="_blank"
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
