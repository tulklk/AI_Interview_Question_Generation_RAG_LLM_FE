"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyGenerateRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/hr/generate");
  }, [router]);
  return null;
}
