"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { portalHeading, portalIconWell, portalInput, portalSubtext } from "@/lib/portal-ui";

export function FileUploadArea() {
  const { t } = useLanguage();
  const fu = t.generatePage.fileUpload;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex items-center gap-3 px-5 py-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
        isDragging
          ? "border-[#6c47ff] bg-[#6c47ff]/5 dark:bg-[#6c47ff]/10"
          : cn(portalInput, "hover:border-gray-300 dark:hover:border-gray-600")
      )}
    >
      <div className={cn("w-8 h-8 rounded-lg border border-gray-100 dark:border-gray-700 flex items-center justify-center shrink-0", portalIconWell)}>
        <Upload size={14} className="text-gray-400 dark:text-gray-500" />
      </div>
      {file ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={cn("text-sm truncate", portalHeading)}>{file.name}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setFile(null); }}
            className={cn("ml-auto shrink-0 hover:text-gray-600 dark:hover:text-gray-300", portalSubtext)}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div>
          <p className={cn("text-sm font-medium", portalHeading)}>{fu.label}</p>
          <p className={cn("text-xs mt-0.5", portalSubtext)}>{fu.support}</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
