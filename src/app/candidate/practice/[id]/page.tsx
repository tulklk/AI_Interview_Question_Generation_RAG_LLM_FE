import { PracticeSessionClient } from "@/features/candidate/components/practice/practice-session-client";
import { CandidateSubscriptionProvider } from "@/features/candidate/context/candidate-subscription-context";

// Dynamic route renders on demand at runtime. Full-screen layout — no sidebar.
export default function PracticeSessionPage() {
  return (
    <CandidateSubscriptionProvider>
      <PracticeSessionClient />
    </CandidateSubscriptionProvider>
  );
}
