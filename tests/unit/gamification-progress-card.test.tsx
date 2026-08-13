import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { GamificationProgressCard } from "@/features/gamification/components/gamification-progress-card";
import type { UserProgress } from "@/features/gamification/types/gamification.types";

// Grounded in src/features/gamification/components/gamification-progress-card.tsx
// and its data hook src/features/gamification/hooks/use-user-progress.ts — the
// XP/level/streak/daily-goal card shown on the Candidate Profile and Settings
// pages. No prior automated coverage existed. Mocks
// @/features/gamification/api/gamification-api's getMyProgress at the module
// boundary; XpProgressBar/XpGuidePanel render for real (no chart library,
// CSS-transition only — see XpProgressBar's own requestAnimationFrame + CSS
// `transition: width` implementation, not framer-motion's animate(), so no
// extended per-test timeout is needed here).
//
// NOTE: useUserProgress seeds its initial state from
// sessionStorage("gamification-progress-snapshot") so the card can show data
// immediately after a practice session completes elsewhere in the app —
// clearing sessionStorage between tests here (global vitest.setup.ts only
// clears localStorage) prevents one test's snapshot from leaking into another.

vi.mock("@/features/gamification/api/gamification-api", () => ({
  getMyProgress: vi.fn(),
}));

import * as gamificationApiTyped from "@/features/gamification/api/gamification-api";
const gamificationApi = gamificationApiTyped as unknown as { getMyProgress: ReturnType<typeof vi.fn> };

function progress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
    totalXp: 1250,
    level: 4,
    currentLevelXp: 250,
    xpRequiredForNextLevel: 500,
    progressPercentage: 50,
    currentStreak: 3,
    longestStreak: 10,
    dailyGoalXp: 50,
    todayXp: 20,
    dailyGoalCompleted: false,
    totalPracticeSessions: 12,
    ...overrides,
  };
}

beforeEach(() => {
  sessionStorage.clear();
  gamificationApi.getMyProgress.mockReset();
});

describe("Gamification Progress Card", () => {
  test("GPC-1: shows level, total XP, streak, and today's XP", async () => {
    gamificationApi.getMyProgress.mockResolvedValue(progress());
    renderWithProviders(<GamificationProgressCard />);

    expect(await screen.findByText("Level 4", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText("1,250 XP")).toBeInTheDocument();
    expect(screen.getByText("Practitioner")).toBeInTheDocument(); // level label for level 4
    expect(screen.getByText("3")).toBeInTheDocument(); // streak mini-stat
  });

  test("GPC-2: a completed daily goal shows the celebratory message", async () => {
    gamificationApi.getMyProgress.mockResolvedValue(progress({ dailyGoalCompleted: true, todayXp: 50 }));
    renderWithProviders(<GamificationProgressCard />);

    expect(await screen.findByText("Daily goal completed! 🎉", {}, { timeout: 10000 })).toBeInTheDocument();
  });

  test("GPC-3: an incomplete daily goal shows the remaining XP", async () => {
    gamificationApi.getMyProgress.mockResolvedValue(progress({ dailyGoalXp: 50, todayXp: 20, dailyGoalCompleted: false }));
    renderWithProviders(<GamificationProgressCard />);

    expect(await screen.findByText("30 XP left to reach your goal", {}, { timeout: 10000 })).toBeInTheDocument();
  });

  test('GPC-4: clicking "How to earn XP?" opens the XP guide panel', async () => {
    gamificationApi.getMyProgress.mockResolvedValue(progress());
    const user = userEvent.setup();
    renderWithProviders(<GamificationProgressCard />);
    await screen.findByText("Level 4", {}, { timeout: 10000 });

    await user.click(screen.getByRole("button", { name: "How to earn XP?" }));

    expect(await screen.findByText("How to earn XP", {}, { timeout: 10000 })).toBeInTheDocument();
  });

  test("GPC-5: a load failure keeps showing the loading skeleton (no crash, no stale data)", async () => {
    gamificationApi.getMyProgress.mockRejectedValue(new Error("network down"));
    renderWithProviders(<GamificationProgressCard />);

    const card = await screen.findByLabelText("Practice progress card", {}, { timeout: 10000 });
    expect(card).toHaveAttribute("aria-busy", "true");
  });
});
