import { vi } from "vitest";
import type { CandidateRecommendation } from "@/features/hr/services/recommendation.service";

export function recommendationServiceMockFactory() {
  return {
    listRecommendations: vi.fn(),
    shortlistRecommendation: vi.fn(),
    dismissRecommendation: vi.fn(),
    inviteRecommendation: vi.fn(),
    sendOffer: vi.fn(),
    restoreRecommendation: vi.fn(),
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
