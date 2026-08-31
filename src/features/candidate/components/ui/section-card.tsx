import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function SectionCard({
  title,
  icon: Icon,
  iconBg = "bg-gray-100 dark:bg-gray-800",
  iconColor = "text-gray-800 dark:text-gray-200",
  children,
}: {
  title: string;
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  children: ReactNode;
}) {
  return (
    <div className="hr-glass-card p-6">
      <div className="flex items-center gap-2.5 mb-5">
        {Icon && (
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
            <Icon size={15} className={iconColor} />
          </div>
        )}
        <h3 className="text-[15px] font-bold text-[#111827] dark:text-gray-100">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function Field({
  label,
  labelIcon,
  full,
  children,
}: {
  label: string;
  /** Optional icon/logo rendered before the label text */
  labelIcon?: ReactNode;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#9CA3AF] dark:text-gray-500 uppercase tracking-wider mb-1.5">
        {labelIcon}
        {label}
      </label>
      {children}
    </div>
  );
}
