"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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

const PANEL_WIDTH = 320;

/**
 * Nút "?" giải thích cách tính điểm.
 * Cả máy tính và điện thoại đều render bảng qua portal trên document.body.
 * Card cha có backdrop-filter nên tạo stacking context — panel absolute bên trong bị card phía dưới che.
 */
export function ScoreHelp({ title, children, ariaLabel, align = "left", label, className }: ScoreHelpProps) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const panelId = useId();

  const clearCloseTimer = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openNow = () => {
    clearCloseTimer();
    setOpen(true);
  };

  // Khoảng trống giữa nút và panel (panel nằm ngoài DOM cha) — delay để rê chuột sang panel không bị đóng.
  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setOpen(false), 140);
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => () => clearCloseTimer(), []);

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

  useLayoutEffect(() => {
    if (!open || isMobile) {
      setPos(null);
      return;
    }

    const place = () => {
      const anchor = rootRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = panelRef.current?.offsetWidth || PANEL_WIDTH;
      const height = panelRef.current?.offsetHeight || 0;
      const gap = 8;
      let left = align === "right" ? rect.right - width : rect.left;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      let top = rect.bottom + gap;
      if (height > 0 && top + height > window.innerHeight - 8) {
        top = Math.max(8, rect.top - gap - height);
      }
      setPos({ top, left });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, isMobile, align, children]);

  const body = (
    <>
      <p className="mb-2 text-[13px] font-bold text-gray-900 dark:text-white">{title}</p>
      <div className="space-y-2 text-[12px] font-normal leading-[18px] text-gray-600 dark:text-gray-300">{children}</div>
    </>
  );

  const desktopPanel =
    open &&
    createPortal(
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-label={title}
        onMouseEnter={openNow}
        onMouseLeave={scheduleClose}
        style={{
          top: pos?.top ?? -9999,
          left: pos?.left ?? 0,
          visibility: pos ? "visible" : "hidden",
        }}
        className={cn(
          "fixed z-[80] w-80 max-h-[min(70vh,24rem)] overflow-y-auto rounded-xl border p-4 text-left shadow-xl",
          PANEL_SURFACE
        )}
      >
        {body}
      </div>,
      document.body
    );

  return (
    <span
      ref={rootRef}
      className={cn("relative inline-flex align-middle", className)}
      onMouseEnter={isMobile ? undefined : openNow}
      onMouseLeave={isMobile ? undefined : scheduleClose}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (isMobile) setOpen((v) => !v);
          else openNow();
        }}
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

      {isMobile
        ? open &&
          createPortal(
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
              <div
                ref={panelRef}
                id={panelId}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={cn(
                  "relative max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-xl border p-4 pr-10 text-left shadow-xl",
                  PANEL_SURFACE
                )}
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
        : desktopPanel}
    </span>
  );
}
