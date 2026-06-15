"use client";

import { BrandLogo } from "@/components/shared/brand-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";

interface AuthPageToolbarProps {
  className?: string;
  logoClassName?: string;
}

export function AuthPageToolbar({
  className,
  logoClassName = "justify-end",
}: AuthPageToolbarProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <ThemeToggle variant="light" />
      <BrandLogo
        className={logoClassName}
        logoClassName="w-10 h-10"
        titleClassName="text-[16px]"
        subtitleClassName="text-[11px]"
      />
    </div>
  );
}
