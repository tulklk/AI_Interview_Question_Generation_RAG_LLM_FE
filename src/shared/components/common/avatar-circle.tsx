"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { getInitials } from "@/shared/utils/user-display";

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-20 h-20 text-2xl font-[800]",
} as const;

const SIZE_PX = {
  sm: 32,
  md: 40,
  lg: 80,
} as const;

interface AvatarCircleProps {
  avatarUrl?: string | null;
  fullName: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  /** Ghi đè kích thước px (bảng user admin dùng 36). */
  pixelSize?: number;
}

export function AvatarCircle({
  avatarUrl,
  fullName,
  size = "sm",
  className,
  pixelSize,
}: AvatarCircleProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const trimmedUrl = avatarUrl?.trim() ?? "";

  // Đổi URL (Cloudinary / Google) thì thử lại, không giữ trạng thái lỗi của ảnh cũ.
  useEffect(() => {
    setImageFailed(false);
  }, [trimmedUrl]);

  const showImage = Boolean(trimmedUrl) && !imageFailed;
  const px = pixelSize ?? SIZE_PX[size];

  return (
    <div
      className={cn(
        "rounded-full bg-[#6c47ff] flex items-center justify-center shrink-0 overflow-hidden",
        SIZE_CLASSES[size],
        className
      )}
      style={{ width: px, height: px, minWidth: px, minHeight: px }}
    >
      {showImage ? (
        <img
          src={trimmedUrl}
          alt=""
          width={px}
          height={px}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="text-white font-bold">{getInitials(fullName || "?")}</span>
      )}
    </div>
  );
}
