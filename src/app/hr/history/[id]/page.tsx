"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ReviewPageClient } from "@/components/results/review-page-client";
import { getGenerationSession } from "@/lib/api/generation";
import { getLocalSession, toGenerationSession } from "@/lib/local-history";
import type { GenerationSession } from "@/types/generation-session";
import { cn } from "@/lib/utils";
import { portalHeading, portalSubtext } from "@/lib/portal-ui";

export default function HrReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<GenerationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    // Local sessions (saved after generation) — no network call needed
    if (id.startsWith("local-")) {
      const local = getLocalSession(id);
      if (local) setSession(toGenerationSession(local));
      else setError("Session not found.");
      setLoading(false);
      return;
    }

    getGenerationSession(id)
      .then(setSession)
      .catch(() => setError("Failed to load session."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AppShell
      breadcrumb={[
        { label: "HR", href: "/hr/dashboard" },
        { label: "History", href: "/hr/history" },
        { label: "Review" },
      ]}
      pageTitle="Review"
    >
      {loading && (
        <div className="flex items-center justify-center py-24 gap-3">
          <Loader2 size={20} className="animate-spin text-primary" />
          <span className={cn("text-sm", portalSubtext)}>Loading session…</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 max-w-lg">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className={cn("text-sm font-medium", portalHeading)}>{error}</p>
        </div>
      )}

      {!loading && !error && session && (
        <ReviewPageClient session={session} />
      )}
    </AppShell>
  );
}
