"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useTilt } from "@/shared/hooks/use-tilt";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
}

export function TiltCard({ children, className, maxTilt = 8 }: TiltCardProps) {
  const { ref, onMouseMove, onMouseLeave } = useTilt<HTMLDivElement>({ maxTilt });

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={cn("tilt-card", className)}
    >
      <div className="tilt-card-glare" aria-hidden="true" />
      {children}
    </div>
  );
}
