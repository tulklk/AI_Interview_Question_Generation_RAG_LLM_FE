"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LegacyHistoryIdRedirect({ id }: { id: string }) {
  const router = useRouter();

  useEffect(() => {
    if (id) router.replace(`/hr/history/${id}`);
  }, [router, id]);

  return null;
}
