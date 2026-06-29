"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useUser } from "@/features/auth/context/user-context";
import { useToast } from "@/shared/providers/toast-context";
import { useLanguage } from "@/shared/providers/language-context";
import { getUserRole, isAuthenticated, getRoleRedirect } from "@/core/auth/permissions";
import { isAdminRole } from "@/features/admin/utils/admin-user-display";

interface AdminRouteGuardProps {
  children: ReactNode;
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const router = useRouter();
  const { user, loading } = useUser();
  const { addToast } = useToast();
  const { t } = useLanguage();
  const deniedMsg = t.adminPages.users.accessDenied;

  const role = user?.role ?? getUserRole();
  const allowed = isAuthenticated() && isAdminRole(role);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    if (!isAdminRole(role)) {
      addToast("error", deniedMsg);
      router.replace(getRoleRedirect(role));
    }
  }, [loading, role, router, addToast, deniedMsg]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#6c47ff]" />
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
