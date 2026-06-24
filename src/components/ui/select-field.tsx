"use client";

import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  id?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  required,
  id,
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3.5 py-2.5 pr-9 text-sm text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
        />
      </div>
    </div>
  );
}
