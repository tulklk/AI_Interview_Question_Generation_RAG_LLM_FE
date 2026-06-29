"use client";

import { BrandLogo } from "@/shared/components/common/brand-logo";
import { ThemeToggle } from "@/shared/components/common/theme-toggle";
import { cn } from "@/lib/cn";

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
