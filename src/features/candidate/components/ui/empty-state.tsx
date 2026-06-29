import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtext?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, subtext, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12 px-6", className)}>
      <div className="w-12 h-12 rounded-full bg-[#F5F3FF] flex items-center justify-center mb-4">
        <Icon size={20} className="text-primary" />
      </div>
      <h3 className="text-[15px] font-[700] text-[#111827]">{title}</h3>
      {subtext && <p className="text-[13px] text-[#6B7280] mt-1.5 max-w-sm">{subtext}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
