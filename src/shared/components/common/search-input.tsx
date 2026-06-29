"use client";

import { Search } from "lucide-react";

export function SearchInput({ placeholder = "Quick search..." }: { placeholder?: string }) {
  return (
    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 w-52 text-sm text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-text">
      <Search size={14} className="shrink-0" />
      <span className="text-xs">{placeholder}</span>
      <kbd className="ml-auto text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded font-mono leading-none">
        ⌘K
      </kbd>
    </div>
  );
}
