"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { compactSkillKey, type TechSkillCatalogItem } from "@/features/studio/utils/focus-area-jd";

interface Props {
  items: TechSkillCatalogItem[];
  disabled?: boolean;
  placeholder: string;
  emptyLabel: string;
  /** Chọn xong đóng list — parent thêm/đổi chip bằng label chuẩn. */
  onSelect: (label: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

function matchesQuery(item: TechSkillCatalogItem, query: string): boolean {
  const raw = query.trim().toLowerCase();
  if (!raw) return true;
  const compact = compactSkillKey(query);
  const forms = [item.label, item.name, item.group, ...(item.aliases ?? [])];
  return forms.some((form) => {
    const lower = form.toLowerCase();
    if (lower.includes(raw)) return true;
    return Boolean(compact) && compactSkillKey(form).includes(compact);
  });
}

/** Combobox catalog-only: gõ lọc label/alias, chọn là thêm — không tạo skill ngoài enum. */
export function TechSkillCombobox({
  items,
  disabled,
  placeholder,
  emptyLabel,
  onSelect,
  onCancel,
  autoFocus,
}: Props) {
  const listId = useId();
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(
    () => items.filter((item) => matchesQuery(item, query)),
    [items, query]
  );

  const groups = useMemo(() => {
    const map = new Map<string, TechSkillCatalogItem[]>();
    for (const item of filtered) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const openList = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [disabled]);

  const pick = useCallback(
    (label: string) => {
      onSelect(label);
      close();
    },
    [close, onSelect]
  );

  useEffect(() => {
    if (!autoFocus || disabled) return;
    openList();
  }, [autoFocus, disabled, openList]);

  useEffect(() => {
    if (activeIndex < filtered.length) return;
    setActiveIndex(0);
  }, [activeIndex, filtered.length]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, close]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function onKeyDown(e: ReactKeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        e.preventDefault();
        openList();
      } else if (e.key === "Escape") {
        onCancel?.();
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
      if (item) pick(item.label);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
      onCancel?.();
    }
  }

  let flatIndex = -1;

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5",
          "border-gray-200 dark:border-gray-700 dark:bg-gray-900",
          open && "border-primary/40 ring-1 ring-primary/20",
          disabled && "opacity-50"
        )}
      >
        <Search size={12} className="shrink-0 text-gray-400" aria-hidden />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && filtered[activeIndex] ? `${listId}-opt-${filtered[activeIndex].name}` : undefined
          }
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-[11px] text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={placeholder}
          onClick={() => (open ? close() : openList())}
          className="shrink-0 text-gray-400 disabled:cursor-not-allowed"
        >
          <ChevronDown size={13} className={cn("transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && !disabled && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {filtered.length === 0 ? (
            <li className="px-2.5 py-2 text-[11px] text-gray-500 dark:text-gray-400">{emptyLabel}</li>
          ) : (
            groups.map(([group, groupItems]) => (
              <li key={group} role="presentation">
                <p className="px-2.5 pb-0.5 pt-1.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                  {group}
                </p>
                <ul>
                  {groupItems.map((item) => {
                    flatIndex += 1;
                    const index = flatIndex;
                    const isActive = index === activeIndex;
                    return (
                      <li
                        key={item.name}
                        id={`${listId}-opt-${item.name}`}
                        role="option"
                        aria-selected={isActive}
                        data-index={index}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pick(item.label)}
                        className={cn(
                          "cursor-pointer px-2.5 py-1.5 text-[11px]",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                        )}
                      >
                        {item.label}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
