import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { AchievementGrid } from "@/features/gamification/components/achievement-grid";
import type { GamificationAchievement } from "@/features/gamification/types/gamification.types";

// Grounded in src/features/gamification/components/achievement-grid.tsx and
// its data hook src/features/gamification/hooks/use-achievements.ts. No prior
// automated coverage existed. Mocks
// @/features/gamification/api/gamification-api's getAchievements at the
// module boundary; AchievementCard renders for real.

vi.mock("@/features/gamification/api/gamification-api", () => ({
  getAchievements: vi.fn(),
}));

import * as gamificationApiTyped from "@/features/gamification/api/gamification-api";
const gamificationApi = gamificationApiTyped as unknown as { getAchievements: ReturnType<typeof vi.fn> };

function achievement(overrides: Partial<GamificationAchievement> = {}): GamificationAchievement {
  return {
    id: "ach-1",
    code: "first_practice",
    name: "First Practice",
    description: "Completed your first practice session",
    unlocked: true,
    unlockedAt: "2026-01-01T00:00:00Z",
    category: "practice",
    ...overrides,
  };
}

beforeEach(() => {
  gamificationApi.getAchievements.mockReset();
});

describe("Achievement Grid — full variant", () => {
  test("AG-1: lists achievements with unlocked count", async () => {
    gamificationApi.getAchievements.mockResolvedValue([
      achievement({ id: "a1", name: "First Practice", unlocked: true }),
      achievement({ id: "a2", name: "7-Day Streak", unlocked: false, unlockedAt: undefined, category: "streak" }),
    ]);
    renderWithProviders(<AchievementGrid variant="full" />);

    expect(await screen.findByText("First Practice", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText("7-Day Streak")).toBeInTheDocument();
    expect(screen.getByText("1/2 Unlocked")).toBeInTheDocument();
  });

  test("AG-2: filtering by category shows only that category's achievements", async () => {
    gamificationApi.getAchievements.mockResolvedValue([
      achievement({ id: "a1", name: "First Practice", category: "practice" }),
      achievement({ id: "a2", name: "7-Day Streak", category: "streak" }),
    ]);
    const user = userEvent.setup();
    renderWithProviders(<AchievementGrid variant="full" />);
    await screen.findByText("First Practice", {}, { timeout: 10000 });

    await user.click(screen.getByRole("button", { name: "Streak" }));

    expect(screen.queryByText("First Practice")).not.toBeInTheDocument();
    expect(screen.getByText("7-Day Streak")).toBeInTheDocument();
  });

  test("AG-3: no achievements shows the empty state", async () => {
    gamificationApi.getAchievements.mockResolvedValue([]);
    renderWithProviders(<AchievementGrid variant="full" />);

    expect(
      await screen.findByText("No achievements yet — start practising!", {}, { timeout: 10000 })
    ).toBeInTheDocument();
  });

  test("AG-4: a load failure shows Try again, and Try again re-fetches", async () => {
    gamificationApi.getAchievements.mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    renderWithProviders(<AchievementGrid variant="full" />);

    const retryBtn = await screen.findByRole("button", { name: "Try again" }, { timeout: 10000 });
    gamificationApi.getAchievements.mockResolvedValue([achievement({ name: "First Practice" })]);
    await user.click(retryBtn);

    expect(await screen.findByText("First Practice", {}, { timeout: 10000 })).toBeInTheDocument();
  });
});

describe("Achievement Grid — compact variant", () => {
  // The compact tile (size="sm") renders the achievement name TWICE — once
  // as the visible tile label, once inside its hover tooltip — so queries
  // here use getAllByText/findAllByText rather than the singular variants.
  test(
    "AG-5: sorts unlocked achievements before locked ones",
    async () => {
      gamificationApi.getAchievements.mockResolvedValue([
        achievement({ id: "locked-1", name: "7-Day Streak", unlocked: false, unlockedAt: undefined }),
        achievement({ id: "unlocked-1", name: "First Practice", unlocked: true, unlockedAt: "2026-01-01T00:00:00Z" }),
      ]);
      renderWithProviders(<AchievementGrid variant="compact" />);

      await screen.findAllByText("First Practice", {}, { timeout: 10000 });
      const names = screen.getAllByText(/^(First Practice|7-Day Streak)$/).map((el) => el.textContent);
      expect(names.indexOf("First Practice")).toBeLessThan(names.indexOf("7-Day Streak"));
    },
    15000
  );
});
