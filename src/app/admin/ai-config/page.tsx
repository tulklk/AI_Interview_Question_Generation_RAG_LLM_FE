"use client";

import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { AdminRouteGuard } from "@/features/admin/components/guards/admin-route-guard";
import { AiConfigPage } from "@/features/admin/components/ai-config/ai-config-page";
import { Cpu } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { AdminPageHeader } from "@/features/admin/components/layout/admin-page-header";

const FALLBACK = {
  heading: "Cấu hình AI",
  subtext: "Chọn provider LLM (Ollama / OpenRouter), model và thông số RAG runtime.",
};

export default function AdminAiConfigRoutePage() {
  const { t } = useLanguage();
  // Fallback khi HMR/cache chưa kịp nạp key mới trong dictionary
  const page = t.adminPages.aiConfigPage ?? FALLBACK;

  return (
    <AdminAppShell
      pageTitle={page.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: page.heading }]}
    >
      <AdminRouteGuard>
        <AdminPageHeader
          heading={page.heading}
          subtext={page.subtext}
          icon={Cpu}
          iconGradient="bg-linear-to-br from-indigo-500 to-violet-600"
          accentGradient="bg-linear-to-r from-indigo-500 via-violet-500 to-primary"
          cardGradient="bg-linear-to-r from-indigo-50 via-white to-violet-50 dark:from-indigo-950/20 dark:via-gray-900 dark:to-violet-950/10"
          cardBorder="border-indigo-100 dark:border-indigo-900/30"
          iconShadow="shadow-indigo-200 dark:shadow-indigo-900/30"
        />

        <AiConfigPage />
      </AdminRouteGuard>
    </AdminAppShell>
  );
}
