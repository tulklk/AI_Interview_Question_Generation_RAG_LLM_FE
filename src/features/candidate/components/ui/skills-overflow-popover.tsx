"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";

function SkillsPopover({
  skills,
  anchorRef,
  onClose,
  formatSkill = (s) => s,
}: {
  skills: string[];
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  formatSkill?: (skill: string) => string;
}) {
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function measure() {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) return;
      const above = window.innerHeight - r.bottom < 260 && r.top > 260;
      setPos({
        top: above ? r.top - 6 : r.bottom + 6,
        left: Math.min(r.left, window.innerWidth - 244 - 8),
        above,
      });
    }
    measure();
    window.addEventListener("scroll", measure, { passive: true, capture: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, { capture: true });
      window.removeEventListener("resize", measure);
    };
  }, [anchorRef]);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (
        ref.current?.contains(e.target as Node) ||
        anchorRef.current?.contains(e.target as Node)
      )
        return;
      onClose();
    }
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [anchorRef, onClose]);

  if (!pos) return null;
  return createPortal(
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        transform: pos.above ? "translateY(-100%)" : undefined,
        zIndex: 9999,
      }}
      className="w-60 max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-3 flex flex-col gap-1.5"
    >
      {skills.map((skill) => {
        const si = getSkillIcon(skill);
        const SIcon = si?.icon;
        return (
          <span
            key={skill}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
          >
            {SIcon && <SIcon size={11} className={cn("shrink-0", si.className)} />}
            <span className="truncate">{formatSkill(skill)}</span>
          </span>
        );
      })}
    </div>,
    document.body
  );
}

export interface SkillsOverflowChipProps {
  /** Hidden skills to list in the popover (not the full list). */
  skills: string[];
  className?: string;
  /** Format skill label in the menu (defaults to identity). */
  formatSkill?: (skill: string) => string;
}

/** `+N` chip that opens a portal dropdown of remaining skills. */
export function SkillsOverflowChip({
  skills,
  className,
  formatSkill = (s) => s,
}: SkillsOverflowChipProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  if (skills.length === 0) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md border shrink-0 transition-colors",
          "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400",
          "hover:bg-primary/10 hover:border-primary/20 hover:text-primary",
          className
        )}
      >
        +{skills.length}
      </button>
      {open && (
        <SkillsPopover
          skills={skills}
          anchorRef={btnRef}
          onClose={() => setOpen(false)}
          formatSkill={formatSkill}
        />
      )}
    </>
  );
}
