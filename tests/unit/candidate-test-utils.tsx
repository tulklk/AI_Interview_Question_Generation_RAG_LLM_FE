import type { ReactElement } from "react";
import { CandidateSubscriptionProvider } from "@/features/candidate/context/candidate-subscription-context";
import { renderWithProviders } from "./test-utils";

// Render helper only — mock factories/fixtures live in candidate-service-mocks.ts
// (kept separate so a vi.mock() factory can import that file without pulling in
// this file's real-component imports, which would otherwise re-import the very
// service module being mocked and hang the module graph).

export function renderCandidate(ui: ReactElement) {
  return renderWithProviders(<CandidateSubscriptionProvider>{ui}</CandidateSubscriptionProvider>);
}
