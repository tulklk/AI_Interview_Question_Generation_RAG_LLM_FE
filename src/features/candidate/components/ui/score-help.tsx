"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CircleHelp, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface ScoreHelpProps {
  /** Tiêu đề ngắn của bảng giải thích. */
  title: string;
  /** Nội dung giải thích (đoạn văn / danh sách ngắn). */
  children: ReactNode;
  /** Tên của nút "?" cho trình đọc màn hình. */
  ariaLabel: string;
  /** Máy tính: bảng giải thích mở lệch trái hay phải so với nút (tránh tràn màn hình). */
  align?: "left" | "right";
  /** Chữ hiển thị cạnh dấu "?" (vd. "Cách tính điểm"). Bỏ trống = chỉ hiện dấu "?". */
  label?: string;
  className?: string;
}

const PANEL_SURFACE =
  "border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200";

/**
 * Nút "?" giải thích cách tính điểm.
 * - Máy tính: rê chuột / focus / bấm để mở, bảng nổi ngay dưới nút.
 * - Điện thoại: bấm để mở bảng giữa màn hình (render qua portal để không bị card cha cắt/lệch), bấm nền hoặc nút X để đóng.
 * Đóng bằng Esc hoặc bấm ra ngoài ở cả hai.
 */
export function ScoreHelp({ title, children, ariaLabel, align = "left", label, className }: ScoreHelpProps) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const body = (
    <>
      <p className="mb-2 text-[13px] font-bold text-gray-900 dark:text-white">{title}</p>
      <div className="space-y-2 text-[12px] font-normal leading-[18px] text-gray-600 dark:text-gray-300">{children}</div>
    </>
  );

  return (
    <span
      ref={rootRef}
      className={cn("relative inline-flex align-middle", className)}
      onMouseEnter={isMobile ? undefined : () => setOpen(true)}
      onMouseLeave={isMobile ? undefined : () => setOpen(false)}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center justify-center gap-1 rounded-full transition-colors outline-none",
          label ? "h-6 px-2 text-[11px] font-semibold" : "h-5 w-5",
          "text-gray-400 hover:text-primary focus-visible:text-primary focus-visible:ring-2 focus-visible:ring-primary/40",
          open && "text-primary"
        )}
      >
        <CircleHelp size={16} />
        {label}
      </button>

      {isMobile ? (
        open &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className={cn("relative max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-xl border p-4 pr-10 text-left shadow-xl", PANEL_SURFACE)}
            >
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
              {body}
            </div>
          </div>,
          document.body
        )
      ) : (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={title}
          className={cn(
            "absolute top-full z-30 mt-2 w-80 rounded-xl border p-4 text-left shadow-xl transition-opacity duration-150",
            PANEL_SURFACE,
            align === "right" ? "right-0" : "left-0",
            open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none invisible"
          )}
        >
          {body}
        </div>
      )}
    </span>
  );
}
