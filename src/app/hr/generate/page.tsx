"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";

/** V1 generate retired — redirect to Studio (generate-v2). Manual: /hr/generate/manual */
export default function HrGeneratePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/hr/generate-v2");
  }, [router]);

  return (
    <AppShell pageTitle="Redirect…">
      <div className="flex justify-center py-16">
        <AiLoadingSpinner />
      </div>
    </AppShell>
  );
}
