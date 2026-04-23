"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileUploadArea() {
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
        "flex items-center gap-3 px-5 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
        isDragging
          ? "border-[#6c47ff] bg-[#6c47ff]/5"
          : "border-gray-200 hover:border-gray-300 bg-white"
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
        <Upload size={14} className="text-gray-400" />
      </div>
      {file ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm text-gray-700 truncate">{file.name}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setFile(null); }}
            className="ml-auto shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium text-gray-700">
            Drag & drop a file, or click to browse
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Supports PDF, DOCX, DOC (max 10MB)
          </p>
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
