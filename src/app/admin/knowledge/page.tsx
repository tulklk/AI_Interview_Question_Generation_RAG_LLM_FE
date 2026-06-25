"use client";

import { AdminAppShell } from "@/components/admin/layout/admin-app-shell";
import { KnowledgePageContent } from "@/components/knowledge/knowledge-page-content";
import {
  getAdminKnowledgeDocs,
  uploadAdminKnowledgeDoc,
  deleteAdminKnowledgeDoc,
  reingestAdminKnowledgeDoc,
  getAdminKnowledgeDoc,
} from "@/lib/api/knowledge";
import { cn } from "@/lib/utils";
import { portalHeadingAlt, portalSubtextAlt } from "@/lib/portal-ui";
import { BookOpen } from "lucide-react";

export default function AdminKnowledgePage() {
  return (
    <AdminAppShell
      pageTitle="Tài liệu kiến thức"
      breadcrumb={[
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Tài liệu kiến thức" },
      ]}
    >
      <div className="mb-8 animate-fade-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#f5f3ff] dark:bg-[#6c47ff]/10 flex items-center justify-center">
            <BookOpen size={20} className="text-[#6c47ff]" />
          </div>
          <h2 className={cn("text-[30px] font-bold leading-9", portalHeadingAlt)}>
            Tài liệu kiến thức
          </h2>
        </div>
        <p className={cn("mt-2 text-base leading-6 ml-[52px]", portalSubtextAlt)}>
          Quản lý tài liệu hệ thống toàn cục — AI sẽ tham chiếu khi tạo câu hỏi cho tất cả HR.
        </p>
      </div>

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
