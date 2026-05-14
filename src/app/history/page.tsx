"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyHistoryRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/hr/history");
  }, [router]);
  return null;
}
