"use client";

import { useRef, useState } from "react";
import { Building2, Upload, Loader2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { uploadLogoToCloudinary, AvatarUploadError } from "@/shared/utils/cloudinary";

export interface LogoUploadLabels {
  logoLabel: string;
  logoUpload: string;
  logoUploading: string;
  logoUploadError: string;
  logoFormats: string;
  logoRemove: string;
}

interface LogoUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  labels: LogoUploadLabels;
  inputClassName?: string;
}

export function LogoUploadField({
  value,
  onChange,
  disabled = false,
  labels,
  inputClassName,
}: LogoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadLogoToCloudinary(file);
      onChange(url);
    } catch (err) {
      const code = err instanceof AvatarUploadError ? err.message : "upload_failed";
      if (code === "invalid_type" || code === "too_large") {
        setUploadError(labels.logoFormats);
      } else {
        setUploadError(labels.logoUploadError);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {/* Preview */}
        <div className={cn(
          "w-12 h-12 rounded-xl shrink-0 flex items-center justify-center overflow-hidden border",
          value
            ? "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            : "bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900/40"
        )}>
          {value ? (
            <img
              src={value}
              alt="logo preview"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Building2 size={18} className="text-violet-400 dark:text-violet-500" />
          )}
        </div>

        {/* Upload button + remove */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => void handleFileChange(e)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {uploading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                {labels.logoUploading}
              </>
            ) : (
              <>
                <Upload size={12} />
                {labels.logoUpload}
              </>
            )}
          </button>

          {value && !uploading && (
            <button
              type="button"
              onClick={() => { onChange(""); setUploadError(null); }}
              disabled={disabled}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              <X size={12} />
              {labels.logoRemove}
            </button>
          )}
        </div>
      </div>

      {/* URL display (readonly) */}
      {value && (
        <input
          type="text"
          value={value}
          readOnly
          className={cn(
            "w-full rounded-xl px-3 py-2 text-xs font-mono text-gray-400 dark:text-gray-500 truncate cursor-default select-all focus:outline-none",
            inputClassName
          )}
        />
      )}

      {/* Hint / error */}
      {uploadError ? (
        <p className="text-xs text-red-500">{uploadError}</p>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500">{labels.logoFormats}</p>
      )}
    </div>
  );
}
