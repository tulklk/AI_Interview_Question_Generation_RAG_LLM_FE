import { describe, test, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { XpHistorySection } from "@/features/gamification/components/xp-history-section";
import type { XpHistoryEntry } from "@/features/gamification/types/gamification.types";

// Grounded in src/features/gamification/components/xp-history-section.tsx —
// the XP transaction log shown standalone and embedded in Candidate Settings'
// "XP History" tab. No prior automated coverage existed. Mocks
// @/features/gamification/api/gamification-api's getXpHistory at the module
// boundary.
//
// NOTE: like useUserProgress, this component seeds from a sessionStorage
// snapshot ("gamification-xp-history-snapshot") so history is visible right
// after a practice session completes elsewhere in the app — sessionStorage
// is cleared between tests here since the global vitest.setup.ts only clears
// localStorage.

vi.mock("@/features/gamification/api/gamification-api", () => ({
  getXpHistory: vi.fn(),
}));

import * as gamificationApiTyped from "@/features/gamification/api/gamification-api";
const gamificationApi = gamificationApiTyped as unknown as { getXpHistory: ReturnType<typeof vi.fn> };

function entry(overrides: Partial<XpHistoryEntry> = {}): XpHistoryEntry {
  return {
    id: "xp-1",
    type: "QuestionCompleted",
    xp: 5,
    label: "Question completed",
    earnedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  sessionStorage.clear();
  gamificationApi.getXpHistory.mockReset();
});

describe("XP History Section — standalone", () => {
  test("XPH-1: lists XP entries with their label and amount", async () => {
    gamificationApi.getXpHistory.mockResolvedValue({
      items: [entry({ label: "Session completed", xp: 20 })],
      total: 1,
    });
    renderWithProviders(<XpHistorySection />);

    expect(await screen.findByText("XP History", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByText("Session completed", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText("+20")).toBeInTheDocument();
  });

  test("XPH-2: falls back to a type-based i18n label when the backend omits one", async () => {
    gamificationApi.getXpHistory.mockResolvedValue({
      items: [entry({ label: "", type: "StreakMilestone", xp: 30 })],
      total: 1,
    });
    renderWithProviders(<XpHistorySection />);

    expect(await screen.findByText("Streak milestone", {}, { timeout: 10000 })).toBeInTheDocument();
  });

  test("XPH-3: no entries shows the empty state", async () => {
    gamificationApi.getXpHistory.mockResolvedValue({ items: [], total: 0 });
    renderWithProviders(<XpHistorySection />);

    expect(
      await screen.findByText("No XP history yet — complete a practice session to earn XP.", {}, { timeout: 10000 })
    ).toBeInTheDocument();
  });

  test("XPH-4: fetches only 10 entries when standalone (not embedded)", async () => {
    gamificationApi.getXpHistory.mockResolvedValue({ items: [], total: 0 });
    renderWithProviders(<XpHistorySection />);

    await vi.waitFor(() => expect(gamificationApi.getXpHistory).toHaveBeenCalledWith(1, 10));
  });
});

describe("XP History Section — embedded", () => {
  test("XPH-5: embedded mode renders without the outer card title, and fetches 30 entries", async () => {
    gamificationApi.getXpHistory.mockResolvedValue({
      items: [entry({ label: "Session completed" })],
      total: 1,
    });
    renderWithProviders(<XpHistorySection embedded />);

    expect(await screen.findByText("Session completed", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.queryByText("XP History")).not.toBeInTheDocument();
    await vi.waitFor(() => expect(gamificationApi.getXpHistory).toHaveBeenCalledWith(1, 30));
  });
});
