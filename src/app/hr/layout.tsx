import { HrSubscriptionProvider } from "@/features/hr/context/hr-subscription-context";

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return <HrSubscriptionProvider>{children}</HrSubscriptionProvider>;
}
