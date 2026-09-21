"use client";

import { Server } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { AdminRagStatus } from "@/features/admin/components/dashboard/admin-rag-status";

/**
 * Read-only by design: AI runtime settings are managed outside the product, so
 * this page reports the RAG service state and nothing more.
 *
 * It used to render an editable provider/model form backed by
 * GET|PUT /api/admin/rag/settings and GET /api/admin/rag/models. Neither
 * endpoint exists, so every visit fired two 404s and the form showed empty
 * fields under a Save button that could never succeed. Only /api/admin/rag/status
 * is implemented, and that is what AdminRagStatus reads.
 */
export function AiConfigPage() {
  const { t } = useLanguage();
  const copy = t.adminPages.aiConfigPage;

  return (
    <div className="space-y-6 animate-fade-up">
      <section className="hr-glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg hr-icon-box flex items-center justify-center">
            <Server size={15} className="text-[#7C3AED] dark:text-[#a78bff]" />
          </div>
          <div>
            <h3 className={cn("text-sm font-semibold", portalHeading)}>{copy.statusTitle}</h3>
            <p className={cn("text-xs", portalSubtext)}>{copy.statusHint}</p>
          </div>
        </div>
        <AdminRagStatus />
      </section>
    </div>
  );
}
