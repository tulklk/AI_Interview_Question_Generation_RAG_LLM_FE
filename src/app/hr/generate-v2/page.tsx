"use client";

import { AppShell } from "@/features/hr/components/layout/app-shell";
import { StudioPage } from "@/features/studio/components/studio-page";

export default function HrGenerateV2Page() {
  return (
    <AppShell
      pageTitle="Tạo câu hỏi v2"
      fullWidth
      breadcrumb={[{ label: "HR", href: "/hr/dashboard" }, { label: "Tạo câu hỏi v2" }]}
    >
      <div className="animate-fade-up">
        <StudioPage />
      </div>
    </AppShell>
  );
}

