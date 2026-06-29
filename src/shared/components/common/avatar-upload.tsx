"use client";

import { useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { AvatarCircle } from "@/shared/components/common/avatar-circle";
import { cn } from "@/lib/cn";

export interface AvatarUploadLabels {
  uploadPhoto: string;
  photoFormats: string;
  uploadingPhoto: string;
  photo?: string;
}

interface AvatarUploadProps {
  avatarUrl?: string | null;
  fullName: string;
  size?: "sm" | "md" | "lg";
  editing?: boolean;
  uploading?: boolean;
  disabled?: boolean;
  onUpload: (url: string) => void;
  onError: (message: string) => void;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  uploadFile: (file: File) => Promise<string>;
  labels: AvatarUploadLabels;
  className?: string;
  avatarClassName?: string;
  layout?: "stacked" | "inline";
}

export function AvatarUpload({
  avatarUrl,
  fullName,
  size = "lg",
  editing = false,
  uploading = false,
  disabled = false,
  onUpload,
  onError,
  onUploadStart,
  onUploadEnd,
  uploadFile,
  labels,
  className,
  avatarClassName,
  layout = "stacked",
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    onUploadStart?.();
    try {
      const url = await uploadFile(file);
      onUpload(url);
    } catch (err) {
      onError(err instanceof Error ? err.message : "upload_failed");
    } finally {
      onUploadEnd?.();
    }
  }

  const isInline = layout === "inline";

  return (
    <div
      className={cn(
        isInline ? "flex items-start gap-4" : "flex flex-col items-center",
        className
      )}
    >
      <div className="relative shrink-0">
        <AvatarCircle
          avatarUrl={avatarUrl}
          fullName={fullName}
          size={size}
          className={avatarClassName}
        />
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <Loader2 size={size === "lg" ? 24 : 16} className="text-white animate-spin" />
          </div>
        )}
      </div>

      <div className={cn(isInline ? "flex-1 min-w-0" : "mt-3 text-center w-full")}>
        {editing ? (
          <>
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
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-semibold text-[#6c47ff] border border-[#6c47ff]/30 rounded-lg px-3 py-1.5 hover:bg-[#6c47ff]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                !isInline && "mx-auto"
              )}
            >
              {uploading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  {labels.uploadingPhoto}
                </>
              ) : (
                <>
                  <Camera size={13} />
                  {labels.uploadPhoto}
                </>
              )}
            </button>
            <p className={cn("text-[11px] text-gray-400 mt-1", !isInline && "px-2")}>
              {labels.photoFormats}
            </p>
          </>
        ) : isInline && labels.photo ? (
          <>
            <p className="text-sm font-medium text-gray-700">{labels.photo}</p>
            <p className="text-xs text-gray-400 mt-0.5">{labels.photoFormats}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}
