import { HrSubscriptionProvider } from "@/features/hr/context/hr-subscription-context";
import { RoleRouteGuard } from "@/shared/components/guards/role-route-guard";

/**
 * The /hr segment had no role check at all, so a candidate session rendered the
 * HR shell — including the "upgraded to Premium" dialog, on an account that has
 * no HR plan. Guard sits outside the subscription provider so a non-HR visitor
 * never triggers the HR subscription fetch either.
 */
export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleRouteGuard role="HR">
      <HrSubscriptionProvider>{children}</HrSubscriptionProvider>
    </RoleRouteGuard>
  );
}
