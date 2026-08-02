"use client";

import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { AdminRouteGuard } from "@/features/admin/components/guards/admin-route-guard";
import { AiConfigPage } from "@/features/admin/components/ai-config/ai-config-page";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

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
        <div className="mb-8 animate-fade-up">
          <h2 className={cn("text-[30px] font-bold leading-9", portalHeadingAlt)}>{page.heading}</h2>
          <p className={cn("text-base leading-6 mt-2", portalSubtextAlt)}>{page.subtext}</p>
        </div>

        <AiConfigPage />
      </AdminRouteGuard>
    </AdminAppShell>
  );
}
