"use client";

import { AppShell } from "@/components/layout/app-shell";
import { KnowledgePageContent } from "@/components/knowledge/knowledge-page-content";
import {
  getHrKnowledgeDocs,
  uploadHrKnowledgeDoc,
  deleteHrKnowledgeDoc,
  reingestHrKnowledgeDoc,
  getHrKnowledgeDoc,
} from "@/lib/api/knowledge";
import { cn } from "@/lib/utils";
import { portalHeading, portalSubtext } from "@/lib/portal-ui";
import { BookOpen } from "lucide-react";

export default function HrKnowledgePage() {
  return (
    <AppShell
      pageTitle="Tài liệu kiến thức"
      breadcrumb={[
        { label: "HR", href: "/hr/dashboard" },
        { label: "Tài liệu kiến thức" },
      ]}
    >
      <div className="mb-6 animate-fade-up">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
            <BookOpen size={18} className="text-violet-500 dark:text-violet-400" />
          </div>
          <h2 className={cn("text-2xl font-bold", portalHeading)}>Tài liệu kiến thức</h2>
        </div>
        <p className={cn("text-sm mt-1 ml-12", portalSubtext)}>
          Tải lên tài liệu để AI tham chiếu khi tạo câu hỏi phỏng vấn chính xác hơn.
        </p>
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
