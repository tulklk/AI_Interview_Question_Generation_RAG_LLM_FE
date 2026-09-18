"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalSubtextAlt } from "@/shared/utils/portal-ui";

/**
 * Trang roadmap dummy cũ — redirect sang AI Coach (SCRUM-447).
 * Lộ trình thật nằm tại /candidate/coach với API roadmaps.
 */
export function CandidateRoadmapPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/candidate/coach");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <Loader2 size={24} className="animate-spin text-primary" />
      <p className={cn("text-[13px]", portalSubtextAlt)}>
        Đang chuyển tới AI Coach…
      </p>
    </div>
  );
}
