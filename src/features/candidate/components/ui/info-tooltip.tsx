"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

interface InfoTooltipProps {
  label: string;
  className?: string;
}

/** Small info-icon button that reveals an explanatory tooltip on hover/focus — keyboard accessible, no external lib. */
export function InfoTooltip({ label, className }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-describedby={tooltipId}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex items-center justify-center w-4 h-4 rounded-full text-gray-400 dark:text-gray-500 hover:text-primary focus-visible:text-primary outline-none"
      >
        <Info size={13} />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          "absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg px-3 py-2 text-[11px] leading-[16px] shadow-lg transition-opacity duration-150",
          "bg-gray-900 dark:bg-gray-800 text-gray-100 border border-gray-800 dark:border-gray-700",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        {label}
      </span>
    </span>
  );
}
