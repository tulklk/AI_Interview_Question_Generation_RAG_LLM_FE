"use client";

import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/cn";

interface ScrollToTopButtonProps {
  visible: boolean;
  onClick: () => void;
  /**
   * Position class override.
   * - Omit → standalone fixed button: "fixed bottom-20 right-6 z-50"
   * - Pass "" → no position class (use when placed inside an already-fixed container)
   */
  positionClassName?: string;
}

export function ScrollToTopButton({ visible, onClick, positionClassName }: ScrollToTopButtonProps) {
  const position = positionClassName !== undefined ? positionClassName : "fixed bottom-20 right-6 z-50";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cuộn lên đầu trang"
      className={cn(
        position,
        "group relative w-10 h-10 rounded-full shrink-0 overflow-hidden",
        // Solid primary colour — same as "Bắt đầu luyện tập" button
        "bg-primary hover:bg-primary/90",
        // Glow shadow
        "shadow-[0_4px_14px_0_rgba(124,58,237,0.45)] hover:shadow-[0_6px_20px_0_rgba(124,58,237,0.65)]",
        // Icon color
        "text-white",
        "flex items-center justify-center",
        "transition-all duration-200 ease-in-out",
        // Focus ring
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2",
        visible
          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
          : "opacity-0 translate-y-3 scale-90 pointer-events-none",
      )}
    >
      {/* Subtle shine overlay */}
      <span
        className="absolute inset-0 rounded-full bg-linear-to-b from-white/20 to-transparent pointer-events-none"
        aria-hidden="true"
      />
      <ArrowUp
        size={16}
        strokeWidth={2.5}
        className="relative z-10 transition-transform duration-200 group-hover:-translate-y-0.5"
      />
    </button>
  );
}
