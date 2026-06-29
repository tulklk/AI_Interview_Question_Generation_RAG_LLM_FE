"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { getInitials } from "@/shared/utils/user-display";

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-20 h-20 text-2xl font-[800]",
} as const;

interface AvatarCircleProps {
  avatarUrl?: string | null;
  fullName: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function AvatarCircle({
  avatarUrl,
  fullName,
  size = "sm",
  className,
}: AvatarCircleProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(avatarUrl?.trim()) && !imageFailed;

  return (
    <div
      className={cn(
        "rounded-full bg-[#6c47ff] flex items-center justify-center shrink-0 overflow-hidden",
        SIZE_CLASSES[size],
        className
      )}
    >
      {showImage ? (
        <img
          src={avatarUrl!.trim()}
          alt={fullName}
          className="w-full h-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="text-white font-bold">{getInitials(fullName || "?")}</span>
      )}
    </div>
  );
}
