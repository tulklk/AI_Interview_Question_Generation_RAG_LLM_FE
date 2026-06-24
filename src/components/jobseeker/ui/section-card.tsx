import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  icon: Icon,
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
  children,
}: {
  title: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  children: ReactNode;
}) {
  return (
    <div className="hr-glass-card p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10", iconBg)}>
          <Icon size={15} className={iconColor} />
        </div>
        <h3 className="text-[15px] font-[700] text-[#111827] dark:text-gray-100">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-[11px] font-[700] text-[#9CA3AF] dark:text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
