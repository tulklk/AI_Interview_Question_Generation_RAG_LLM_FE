import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { DailyGoalSettings } from "@/features/gamification/components/daily-goal-settings";
import type { UserProgress } from "@/features/gamification/types/gamification.types";

// Grounded in src/features/gamification/components/daily-goal-settings.tsx —
// the daily-XP-goal preset picker shown on the Candidate Settings "General"
// tab. No prior automated coverage existed. Mocks
// @/features/gamification/api/gamification-api's getMyProgress/updateDailyGoal
// at the module boundary.

vi.mock("@/features/gamification/api/gamification-api", () => ({
  getMyProgress: vi.fn(),
  updateDailyGoal: vi.fn(),
}));

import * as gamificationApiTyped from "@/features/gamification/api/gamification-api";
const gamificationApi = gamificationApiTyped as unknown as {
  getMyProgress: ReturnType<typeof vi.fn>;
  updateDailyGoal: ReturnType<typeof vi.fn>;
};

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
  gamificationApi.updateDailyGoal.mockReset();
});

describe("Daily Goal Settings", () => {
  test("DGS-1: highlights the current server-saved preset as active", async () => {
    gamificationApi.getMyProgress.mockResolvedValue(progress({ dailyGoalXp: 50 }));
    renderWithProviders(<DailyGoalSettings />);

    const steadyBtn = await screen.findByText("50 XP", {}, { timeout: 10000 });
    expect(steadyBtn.closest("button")).toHaveClass("border-violet-300");
  });

  test("DGS-2: the Save button is hidden until a different preset is selected", async () => {
    gamificationApi.getMyProgress.mockResolvedValue(progress({ dailyGoalXp: 50 }));
    renderWithProviders(<DailyGoalSettings />);
    await screen.findByText("50 XP", {}, { timeout: 10000 });

    expect(screen.queryByRole("button", { name: "Save goal" })).not.toBeInTheDocument();
  });

  test("DGS-3: selecting a different preset and saving calls updateDailyGoal", async () => {
    gamificationApi.getMyProgress.mockResolvedValue(progress({ dailyGoalXp: 50 }));
    gamificationApi.updateDailyGoal.mockResolvedValue({ dailyGoalXp: 80 });
    const user = userEvent.setup();
    renderWithProviders(<DailyGoalSettings />);
    await screen.findByText("50 XP", {}, { timeout: 10000 });

    await user.click(screen.getByText("80 XP"));
    await user.click(screen.getByRole("button", { name: "Save goal" }));

    await vi.waitFor(() => expect(gamificationApi.updateDailyGoal).toHaveBeenCalledWith(80));
    expect(await screen.findByText("Daily goal updated")).toBeInTheDocument();
  });

  test("DGS-4: after saving, the newly picked preset shows as active immediately (optimistic)", async () => {
    gamificationApi.getMyProgress.mockResolvedValue(progress({ dailyGoalXp: 50 }));
    gamificationApi.updateDailyGoal.mockResolvedValue({ dailyGoalXp: 80 });
    const user = userEvent.setup();
    renderWithProviders(<DailyGoalSettings />);
    await screen.findByText("50 XP", {}, { timeout: 10000 });

    await user.click(screen.getByText("80 XP"));
    await user.click(screen.getByRole("button", { name: "Save goal" }));
    await screen.findByText("Daily goal updated");

    expect(screen.getByText("80 XP").closest("button")).toHaveClass("border-violet-300");
    expect(screen.queryByRole("button", { name: "Save goal" })).not.toBeInTheDocument();
  });

  test("DGS-5: a save failure shows an error toast and keeps the Save button visible", async () => {
    gamificationApi.getMyProgress.mockResolvedValue(progress({ dailyGoalXp: 50 }));
    gamificationApi.updateDailyGoal.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderWithProviders(<DailyGoalSettings />);
    await screen.findByText("50 XP", {}, { timeout: 10000 });

    await user.click(screen.getByText("120 XP"));
    await user.click(screen.getByRole("button", { name: "Save goal" }));

    expect(await screen.findByText("Could not update goal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save goal" })).toBeInTheDocument();
  });
});
