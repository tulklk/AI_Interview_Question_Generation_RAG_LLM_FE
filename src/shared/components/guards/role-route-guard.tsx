"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/features/auth/context/user-context";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { useToast } from "@/shared/providers/toast-context";
import { useLanguage } from "@/shared/providers/language-context";
import { getUserRole, isAuthenticated, getRoleRedirect } from "@/core/auth/permissions";

export type GuardedRole = "ADMIN" | "HR" | "CANDIDATE";

interface RoleRouteGuardProps {
  /** Role required to view anything under this route segment. */
  role: GuardedRole;
  children: ReactNode;
}

function hasRole(role: string | null, required: GuardedRole): boolean {
  const r = (role ?? "").toUpperCase();
  // Admins reach the HR area too; an HR account never reaches /admin.
  if (required === "HR") return r.includes("HR") || r.includes("ADMIN");
  if (required === "CANDIDATE") {
    return (
      r.includes("JOB_SEEKER") ||
      r.includes("CANDIDATE") ||
      r.includes("JOBSEEKER")
    );
  }
  return r.includes("ADMIN");
}

/**
 * Route-segment guard. Mount it from the segment's `layout.tsx` so every page
 * underneath is covered — wiring a guard per page meant new pages shipped
 * unprotected (6 of 13 admin pages had none, and the whole /hr area had none),
 * which let a candidate session render the HR and admin shells. The backend
 * already refuses the data with 403; this stops the interface from rendering
 * at all and sends the user back to their own area.
 */
export function RoleRouteGuard({ role, children }: RoleRouteGuardProps) {
  const router = useRouter();
  const { user, loading } = useUser();
  const { addToast } = useToast();
  const { t } = useLanguage();
  const deniedMsg = t.adminPages.users.accessDenied;

  const current = user?.role ?? getUserRole();
  const allowed = isAuthenticated() && hasRole(current, role);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    if (!hasRole(current, role)) {
      addToast("error", deniedMsg);
      router.replace(getRoleRedirect(current));
    }
  }, [loading, current, role, router, addToast, deniedMsg]);

  // Back/forward can restore a page from the bfcache without re-running the effect
  // above, which would show a logged-out user the previous account's screen.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted && !isAuthenticated()) router.replace("/login");
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] w-full items-center justify-center">
        <AiLoadingSpinner />
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
