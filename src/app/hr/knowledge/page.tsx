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
import { BookOpen } from "lucide-react";
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
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
            <BookOpen size={18} className="text-violet-500 dark:text-violet-400" />
          </div>
          <h2 className={cn("text-2xl font-bold", portalHeading)}>{kb.hrTitle}</h2>
        </div>
        <p className={cn("text-sm mt-1 ml-12", portalSubtext)}>{kb.hrSubtext}</p>
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
