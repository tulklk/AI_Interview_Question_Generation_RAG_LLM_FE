import { RoleRouteGuard } from "@/shared/components/guards/role-route-guard";

/**
 * Guard the whole /candidate segment so logged-out or wrong-role sessions
 * redirect to login / their portal instead of rendering the shell and 403ing APIs.
 */
export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return <RoleRouteGuard role="CANDIDATE">{children}</RoleRouteGuard>;
}
