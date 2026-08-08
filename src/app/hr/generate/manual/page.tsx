"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HrGenerateManualPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/hr/question-builder");
  }, [router]);

  return null;
}
