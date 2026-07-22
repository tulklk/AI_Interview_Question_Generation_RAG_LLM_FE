"use client";

import { AppShell } from "@/features/hr/components/layout/app-shell";
import { KnowledgePageContent } from "@/features/knowledge/components/knowledge-page-content";
import {
  getHrKnowledgeDocs,
  uploadHrKnowledgeDoc,
  deleteHrKnowledgeDoc,
  reingestHrKnowledgeDoc,
  getHrKnowledgeDoc,
} from "@/features/knowledge/services/knowledge.service";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

export default function HrKnowledgePage() {
  const { t } = useLanguage();
  const kb = t.knowledgePage;

  return (
    <AppShell
      pageTitle={kb.hrTitle}
      breadcrumb={[
        { label: "HR", href: "/hr/dashboard" },
        { label: kb.breadcrumbLabel },
      ]}
    >
      <div className="mb-6 animate-fade-up">
        <h2 className={cn("text-2xl font-bold", portalHeading)}>{kb.hrTitle}</h2>
        <p className={cn("text-sm mt-1", portalSubtext)}>{kb.hrSubtext}</p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <KnowledgePageContent
          variant="hr"
          onFetchDocs={getHrKnowledgeDocs}
          onUpload={uploadHrKnowledgeDoc}
          onDelete={deleteHrKnowledgeDoc}
          onReingest={reingestHrKnowledgeDoc}
          onRefreshDoc={getHrKnowledgeDoc}
        />
      </div>
    </AppShell>
  );
}
