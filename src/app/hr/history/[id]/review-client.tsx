"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { HistoryReviewSkeleton } from "@/features/hr/components/history/history-review-skeleton";
import { useLanguage } from "@/shared/providers/language-context";

/**
 * /hr/history/[id] đã được gộp vào hub /hr/published/[id] (tab Review).
 * Giữ route này chỉ để redirect, tránh hỏng link cũ / bookmark / thông báo.
 * Query hiện có (vd. ?jdFit=1) được giữ nguyên.
 */
export function HrReviewPageClient() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (!id) {
      router.replace("/hr/history");
      return;
    }
    const q = new URLSearchParams(window.location.search);
    q.set("tab", "review");
    router.replace(`/hr/published/${id}?${q.toString()}`);
  }, [id, router]);

  return (
    <AppShell
      pageTitle={t.historyPage.heading}
      breadcrumb={[
        { label: "HR", href: "/hr/dashboard" },
        { label: t.historyPage.heading, href: "/hr/history" },
      ]}
    >
      <HistoryReviewSkeleton />
    </AppShell>
  );
}
