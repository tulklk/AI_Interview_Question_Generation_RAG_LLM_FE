"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PublishedSetHubSkeleton } from "@/features/hr/components/published/published-skeletons";

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
    <div className="px-4 py-6">
      <PublishedSetHubSkeleton />
    </div>
  );
}
