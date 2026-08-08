"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";

/** V1 generate retired — redirect to Studio. Manual: /hr/generate/manual */
export default function HrGeneratePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/hr/generate-question");
  }, [router]);

  return (
    <AppShell pageTitle="Redirect…">
      <div className="flex justify-center py-16">
        <AiLoadingSpinner />
      </div>
    </AppShell>
  );
}
