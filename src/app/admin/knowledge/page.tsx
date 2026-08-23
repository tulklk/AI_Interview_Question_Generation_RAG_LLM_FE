"use client";

import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { KnowledgePageContent } from "@/features/knowledge/components/knowledge-page-content";
import {
  getAdminKnowledgeDocs,
  uploadAdminKnowledgeDoc,
  deleteAdminKnowledgeDoc,
  reingestAdminKnowledgeDoc,
  getAdminKnowledgeDoc,
} from "@/features/knowledge/services/knowledge.service";
import { BookOpen } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { AdminPageHeader } from "@/features/admin/components/layout/admin-page-header";

export default function AdminKnowledgePage() {
  const { t } = useLanguage();
  const kb = t.knowledgePage;

  return (
    <AdminAppShell
      pageTitle={kb.adminTitle}
      breadcrumb={[
        { label: "Admin", href: "/admin/dashboard" },
        { label: kb.breadcrumbLabel },
      ]}
    >
      <AdminPageHeader
        heading={kb.adminTitle}
        subtext={kb.adminSubtext}
        icon={BookOpen}
        iconGradient="bg-linear-to-br from-violet-500 to-primary"
        accentGradient="bg-linear-to-r from-violet-500 via-primary to-cyan-400"
        cardGradient="bg-linear-to-r from-violet-50 via-white to-cyan-50 dark:from-violet-950/20 dark:via-gray-900 dark:to-cyan-950/10"
        cardBorder="border-violet-100 dark:border-violet-900/30"
        iconShadow="shadow-violet-200 dark:shadow-violet-900/30"
      />

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <KnowledgePageContent
          variant="admin"
          onFetchDocs={getAdminKnowledgeDocs}
          onUpload={uploadAdminKnowledgeDoc}
          onDelete={deleteAdminKnowledgeDoc}
          onReingest={reingestAdminKnowledgeDoc}
          onRefreshDoc={getAdminKnowledgeDoc}
        />
      </div>
    </AdminAppShell>
  );
}
