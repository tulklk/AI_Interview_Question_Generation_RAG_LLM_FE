import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
}

export function FormField({ label, required, htmlFor, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
