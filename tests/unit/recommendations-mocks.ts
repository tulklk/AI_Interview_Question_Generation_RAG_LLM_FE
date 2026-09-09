import { vi } from "vitest";
import type { CandidateRecommendation } from "@/features/hr/services/recommendation.service";

// NO static import of anything from recommendation.service here — see
// candidate-service-mocks.ts's header comment: a vi.mock() factory does
// `await import(this file)`, so a top-level import back into the very module
// being mocked resolves circularly and hangs vitest (this file did exactly
// that with `isCandidateAccepted` before). Use vi.importActual inside the
// factory instead, which explicitly bypasses the mock registry.

export async function recommendationServiceMockFactory() {
  const actual = await vi.importActual<typeof import("@/features/hr/services/recommendation.service")>(
    "@/features/hr/services/recommendation.service"
  );
  return {
    listRecommendations: vi.fn(),
    shortlistRecommendation: vi.fn(),
    dismissRecommendation: vi.fn(),
    inviteRecommendation: vi.fn(),
    sendOffer: vi.fn(),
    restoreRecommendation: vi.fn(),
    // Pure business logic (no API call) — keep the real implementation instead
    // of stubbing it, since recommendations-list.tsx calls it directly to
    // decide whether to show the "accepted" badge.
    isCandidateAccepted: actual.isCandidateAccepted,
  };
}

export function recommendation(overrides: Partial<CandidateRecommendation> = {}): CandidateRecommendation {
  return {
    id: "rec-1",
    candidateUserId: "cand-1",
    candidateName: "Nguyen Van A",
    candidateEmail: "a@example.com",
    targetRole: "Backend Developer",
    techStack: ["Node.js", "SQL"],
    score: 88,
    questionSetId: "set-1",
    questionSetTitle: "Backend Developer Interview",
    completedAt: new Date().toISOString(),
    status: "NEW",
    recommendationReason: null,
    invitationStatus: null,
    invitationResponseMessage: null,
    invitationSharedPhoneNumber: null,
    latestOfferStatus: null,
    viewedAt: null,
    fitPercent: null,
    invitationScheduledAtUtc: null,
    invitationTimeZoneId: null,
    invitationMeetingMode: null,
    invitationMeetingLink: null,
    invitationLocation: null,
    ...overrides,
  };
}
