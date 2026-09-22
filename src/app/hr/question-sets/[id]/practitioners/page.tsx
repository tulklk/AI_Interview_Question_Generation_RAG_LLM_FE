"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";

/**
 * Legacy route — redirect về hub published (tab practitioners).
 * Giữ path cũ để bookmark / link cũ không gãy.
 */
export default function HrPractitionersRoute() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id ?? "";

  useEffect(() => {
    if (!id) return;
    router.replace(`/hr/published/${id}?tab=practitioners`);
  }, [id, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <AiLoadingSpinner />
    </div>
  );
}
