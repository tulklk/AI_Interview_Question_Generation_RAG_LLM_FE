"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * SCRUM-477: gộp UI — Tạo nhanh nằm trong Question Builder.
 * Redirect về /hr/generate-question/manual.
 */
export default function HrGenerateManualPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/hr/generate-question/manual");
  }, [router]);

  return null;
}
