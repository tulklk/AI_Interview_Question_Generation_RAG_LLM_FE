"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  Briefcase,
  Check,
  ChevronDown,
  Copy,
  Search,
  X,
} from "lucide-react";
import { SAMPLE_JDS, resolveSampleJdText, type SampleJd } from "@/features/studio/data/sample-jds";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

const MODAL_ANIM_MS = 220;

const SECTION_HEADINGS = new Set([
  "Trách nhiệm:",
  "Yêu cầu:",
  "Responsibilities:",
  "Requirements:",
  "Trách nhiệm",
  "Yêu cầu",
  "Responsibilities",
  "Requirements",
]);

function experienceFromSubtitle(subtitle: string, title: string): string {
  const parts = subtitle.split(" · ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.slice(1).join(" · ");
  if (subtitle.startsWith(title)) {
    return subtitle.slice(title.length).replace(/^[\s·\-–—]+/, "").trim() || subtitle;
  }
  return subtitle;
}

function JdPreviewBody({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className={cn("font-sans text-[13px] leading-[1.6]", portalHeading)}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const isHeading = SECTION_HEADINGS.has(trimmed);
        return (
          <p
            key={i}
            className={cn(
              trimmed === "" ? "h-3" : undefined,
              isHeading && (i > 0 ? "mt-4 font-semibold" : "font-semibold")
            )}
          >
            {line || "\u00a0"}
          </p>
        );
      })}
    </div>
  );
}

function RoleCombobox({
  selected,
  locale,
  label,
  searchPlaceholder,
  emptyLabel,
  onSelect,
  onOpenChange,
}: {
  selected: SampleJd;
  locale: "vi" | "en";
  label: string;
  searchPlaceholder: string;
  emptyLabel: string;
  onSelect: (id: string) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const listId = useId();
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const setOpenSafe = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
      if (!next) setQuery("");
    },
    [onOpenChange]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SAMPLE_JDS;
    return SAMPLE_JDS.filter((s) => {
      const title = s.title[locale].toLowerCase();
      const subtitle = s.subtitle[locale].toLowerCase();
      return title.includes(q) || subtitle.includes(q) || s.id.includes(q);
    });
  }, [query, locale]);

  useEffect(() => {
    if (!open) return;
    const idx = filtered.findIndex((s) => s.id === selected.id);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, filtered, selected.id]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpenSafe(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, setOpenSafe]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function openList() {
    setOpenSafe(true);
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function pick(id: string) {
    onSelect(id);
    setOpenSafe(false);
  }

  function onKeyDown(e: ReactKeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filtered.length === 0) return;
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length === 0) return;
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) pick(item.id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpenSafe(false);
    }
  }

  const selectedTitle = selected.title[locale];

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className={cn("mb-1.5 block text-[11px] font-medium", portalSubtext)}>
        {label}
      </label>
      <div
        className={cn(
          "flex h-10 items-center gap-2 rounded-lg border bg-white px-3 transition-colors",
          "border-gray-200 dark:border-gray-700 dark:bg-gray-950",
          open && "border-primary/40 ring-1 ring-primary/20"
        )}
      >
        <Search size={14} className="shrink-0 text-gray-400" aria-hidden />
        {open ? (
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && filtered[activeIndex] ? `${listId}-opt-${filtered[activeIndex].id}` : undefined
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            className={cn(
              "min-w-0 flex-1 bg-transparent text-sm outline-none",
              "placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
            )}
          />
        ) : (
          <button
            type="button"
            id={inputId}
            role="combobox"
            aria-expanded={false}
            aria-controls={listId}
            aria-haspopup="listbox"
            onClick={openList}
            onKeyDown={onKeyDown}
            className={cn(
              "flex min-w-0 flex-1 items-center text-left text-sm outline-none",
              "focus-visible:ring-2 focus-visible:ring-primary/30 rounded",
              portalHeading
            )}
          >
            <span className="truncate">{selectedTitle}</span>
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => (open ? setOpenSafe(false) : openList())}
          className="shrink-0 text-gray-400"
        >
          <ChevronDown
            size={15}
            className={cn("transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          className={cn(
            "absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg",
            "dark:border-gray-700 dark:bg-gray-900"
          )}
        >
          {filtered.length === 0 ? (
            <li className={cn("px-3 py-2 text-xs", portalSubtext)}>{emptyLabel}</li>
          ) : (
            filtered.map((sample, index) => {
              const title = sample.title[locale];
              const isSelected = sample.id === selected.id;
              const isActive = index === activeIndex;
              return (
                <li
                  key={sample.id}
                  id={`${listId}-opt-${sample.id}`}
                  role="option"
                  aria-selected={isSelected}
                  data-index={index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(sample.id)}
                  className={cn(
                    "cursor-pointer px-3 py-2 text-sm transition-colors",
                    isActive && "bg-primary/10 text-primary",
                    !isActive && isSelected && "font-semibold text-primary",
                    !isActive && !isSelected && "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                  )}
                >
                  {title}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

export function SampleJdModal({
  onClose,
  onUse,
}: {
  onClose: () => void;
  onUse: (content: string) => void;
}) {
  const { t, lang } = useLanguage();
  const { addToast } = useToast();
  const src = t.studioPage.sources;
  const locale = lang === "en" ? "en" : "vi";
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState(SAMPLE_JDS[0]?.id ?? "fullstack");
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboboxOpenRef = useRef(false);
  comboboxOpenRef.current = comboboxOpen;

  const selected = SAMPLE_JDS.find((s) => s.id === selectedId) ?? SAMPLE_JDS[0];
  const resolved = selected ? resolveSampleJdText(selected, locale) : null;
  const experience = selected
    ? experienceFromSubtitle(selected.subtitle[locale], selected.title[locale])
    : "";

  const close = useCallback(() => {
    setVisible(false);
    timerRef.current = setTimeout(onClose, MODAL_ANIM_MS);
  }, [onClose]);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Focus trap + Escape
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    const first = focusables()[0];
    first?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (e.defaultPrevented || comboboxOpenRef.current) return;
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const items = focusables();
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [close]);

  function handleCopy() {
    if (!resolved) return;
    void navigator.clipboard.writeText(resolved.content).then(() => {
      setCopied(true);
      addToast("success", src.sampleCopiedToast);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
      <div
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity",
          visible ? "opacity-100" : "opacity-0"
        )}
        style={{ transitionDuration: `${MODAL_ANIM_MS}ms` }}
        onClick={close}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 flex w-full flex-col overflow-hidden border border-gray-100 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900",
          "max-h-[100dvh] rounded-t-2xl sm:max-h-[74vh] sm:max-w-[560px] sm:rounded-2xl md:max-w-[560px]",
          "max-sm:h-auto max-sm:max-h-[100dvh] sm:h-auto",
          "w-full sm:w-[min(560px,90vw)]",
          "transition-all ease-[cubic-bezier(0.34,1.4,0.64,1)]",
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0"
        )}
        style={{ transitionDuration: `${MODAL_ANIM_MS}ms` }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-0 pt-5">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40">
              <BookOpen size={15} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <p id={titleId} className={cn("text-sm font-semibold leading-tight", portalHeading)}>
                {src.sampleJd}
              </p>
              <p className={cn("mt-0.5 text-[11px] leading-snug", portalSubtext)}>
                {src.sampleModalHint}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={src.close}
            className={cn(
              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors",
              "hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              "dark:hover:bg-gray-800 dark:hover:text-gray-300"
            )}
          >
            <X size={14} />
          </button>
        </div>

        {/* Role + summary */}
        <div className="shrink-0 space-y-3 px-5 pt-4">
          {selected && (
            <RoleCombobox
              selected={selected}
              locale={locale}
              label={src.sampleRoleLabel}
              searchPlaceholder={src.sampleRoleSearch}
              emptyLabel={src.sampleNoRoles}
              onSelect={setSelectedId}
              onOpenChange={setComboboxOpen}
            />
          )}

          {selected && (
            <div className="flex items-start gap-2">
              <Briefcase size={14} className="mt-0.5 shrink-0 text-violet-500" aria-hidden />
              <div className="min-w-0">
                <p className={cn("text-sm font-semibold leading-tight", portalHeading)}>
                  {selected.title[locale]}
                </p>
                {experience && (
                  <p className={cn("mt-0.5 text-[12px]", portalSubtext)}>{experience}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Preview — only scroll region */}
        <div className="flex min-h-0 flex-1 flex-col px-5 pt-4 pb-0">
          <p
            className={cn(
              "mb-2 shrink-0 text-[10px] font-semibold uppercase tracking-wide",
              portalSubtext
            )}
          >
            {src.samplePreviewLabel}
          </p>
          <div
            className={cn(
              "min-h-0 max-h-[340px] flex-1 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-4",
              "dark:border-gray-700/50 dark:bg-gray-800/60"
            )}
          >
            {resolved ? <JdPreviewBody content={resolved.content} /> : null}
          </div>
        </div>

        {/* Footer */}
        <div
          className={cn(
            "mt-4 flex shrink-0 flex-col gap-2 border-t border-gray-100 px-5 py-3.5 dark:border-gray-800",
            "pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:pb-3.5"
          )}
        >
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors",
              "border-gray-200 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              "dark:border-gray-700 dark:hover:bg-gray-800 sm:justify-start",
              portalHeading
            )}
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            {copied ? src.copied : "Copy"}
          </button>
          <div className="hidden flex-1 sm:block" />
          <div className="flex gap-2 sm:contents">
            <button
              type="button"
              onClick={close}
              className={cn(
                "h-9 flex-1 rounded-lg border px-4 text-xs font-semibold transition-colors sm:flex-none",
                "border-gray-200 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                "dark:border-gray-700 dark:hover:bg-gray-800",
                portalHeading
              )}
            >
              {src.close}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!resolved) return;
                onUse(resolved.content);
                close();
              }}
              className="shimmer-button hr-cta-btn h-9 flex-1 rounded-lg px-4 text-xs font-semibold text-white sm:flex-none"
            >
              {src.useSample}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
