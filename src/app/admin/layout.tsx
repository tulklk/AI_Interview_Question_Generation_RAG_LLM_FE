import { RoleRouteGuard } from "@/shared/components/guards/role-route-guard";

/**
 * Guards the whole /admin segment. Previously each page wired its own
 * AdminRouteGuard and 6 of 13 pages were missed, so a non-admin session
 * rendered the admin shell (data still 403'd, but the interface showed).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleRouteGuard role="ADMIN">{children}</RoleRouteGuard>;
}
