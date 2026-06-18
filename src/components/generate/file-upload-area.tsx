"use client";

import { useRef, useState } from "react";
import { Upload, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { portalHeading, portalIconWell, portalInput, portalSubtext } from "@/lib/portal-ui";

const ACCEPTED_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const ACCEPTED_EXTS = [".pdf", ".doc", ".docx"];
const MAX_SIZE_MB = 10;

interface FileUploadAreaProps {
  onFileChange?: (file: File | null) => void;
}

export function FileUploadArea({ onFileChange }: FileUploadAreaProps) {
  const { t } = useLanguage();
  const fu = t.generatePage.fileUpload;
  const fe = t.generationSessionPage.fileErrors;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function validateAndSet(f: File) {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    const validType = ACCEPTED_TYPES.includes(f.type) || ACCEPTED_EXTS.includes(ext);
    if (!validType) {
      setFileError(fe.invalidType);
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileError(fe.tooLarge);
      return;
    }
    setFileError(null);
    setFile(f);
    onFileChange?.(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSet(dropped);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) validateAndSet(selected);
  }

  return (
    <div>
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
              onClick={(e) => { e.stopPropagation(); setFile(null); onFileChange?.(null); }}
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
      {fileError && (
        <div className="flex items-center gap-2 mt-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={13} />
          {fileError}
        </div>
      )}
    </div>
  );
}
