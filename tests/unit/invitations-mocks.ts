import { vi } from "vitest";
import type { CandidateInvitation } from "@/features/candidate/services/invitation.service";

// Pure mock-factory + fixture helpers — no real-component imports, so a
// vi.mock() factory can safely `await import(...)` this module (see
// candidate-service-mocks.ts for why that matters).

export function invitationServiceMockFactory() {
  return {
    listInvitations: vi.fn(),
    acceptInvitation: vi.fn(),
    rejectInvitation: vi.fn(),
  };
}

export function invitation(overrides: Partial<CandidateInvitation> = {}): CandidateInvitation {
  return {
    id: "inv-1",
    companyName: "Acme Corp",
    companyLogoUrl: null,
    questionSetId: "set-1",
    questionSetTitle: "Backend Developer Interview",
    message: "We were impressed by your practice score!",
    status: "PENDING",
    createdAt: new Date().toISOString(),
    respondedAt: null,
    scheduledAtUtc: null,
    timeZoneId: null,
    meetingMode: null,
    meetingLink: null,
    location: null,
    ...overrides,
  };
}
