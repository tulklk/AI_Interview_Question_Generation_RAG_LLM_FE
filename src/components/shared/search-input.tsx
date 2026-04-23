"use client";

import { Search } from "lucide-react";

export function SearchInput({ placeholder = "Quick search..." }: { placeholder?: string }) {
  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 w-52 text-sm text-gray-400 hover:border-gray-300 transition-colors cursor-text">
      <Search size={14} className="shrink-0" />
      <span className="text-xs">{placeholder}</span>
      <kbd className="ml-auto text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-mono leading-none">
        ⌘K
      </kbd>
    </div>
  );
}
