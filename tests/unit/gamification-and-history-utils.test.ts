import { describe, test, expect, vi, afterEach } from "vitest";
import {
  formatXp, getLevelLabel, getLevelColorClass, getLevelBarColor, streakIntensity, xpRewardTypeLabel, timeAgo,
} from "@/features/gamification/utils/gamification-formatters";
import {
  markLoginWelcomePending, hasLoginWelcomePending, clearLoginWelcomePending,
} from "@/features/auth/utils/login-welcome";

// Grounded in the listed pure-function / sessionStorage modules — no
// rendering needed. Parameterized tables keep one row per branch of the
// function under test (the tier/threshold edge value), not every value in a
// range.

describe("gamification-formatters.ts", () => {
  test("formatXp adds thousands separators", () => {
    expect(formatXp(1200)).toBe("1,200");
    expect(formatXp(0)).toBe("0");
  });

  test.each([
    [2, "Newcomer"],
    [5, "Practitioner"],
    [9, "Achiever"],
    [14, "Trailblazer"],
    [19, "Specialist"],
    [29, "Mentor"],
    [30, "Legend"],
  ])("getLevelLabel(%i) -> %s", (level, expected) => {
    expect(getLevelLabel(level)).toBe(expected);
  });

  test("getLevelColorClass and getLevelBarColor stay in sync with the same tier boundaries", () => {
    expect(getLevelColorClass(1)).toContain("gray");
    expect(getLevelBarColor(1)).toBe("#6b7280");
    expect(getLevelColorClass(30)).toContain("yellow");
    expect(getLevelBarColor(30)).toBe("#eab308");
  });

  test.each([
    [0, 0], [2, 1], [6, 2], [7, 3],
  ] as const)("streakIntensity(%i) -> %i", (streak, expected) => {
    expect(streakIntensity(streak)).toBe(expected);
  });

  test("xpRewardTypeLabel resolves per-locale and falls back to the raw type for an unknown value", () => {
    expect(xpRewardTypeLabel("StreakMilestone", "en")).toBe("Streak milestone");
    expect(xpRewardTypeLabel("StreakMilestone", "vi")).toBe("Mốc luyện tập liên tiếp");
    expect(xpRewardTypeLabel("SomethingNew" as never, "en")).toBe("SomethingNew");
  });

  describe("timeAgo", () => {
    afterEach(() => vi.useRealTimers());

    // vi and en are separate code paths in timeAgo(), so each bucket is
    // checked once per locale.
    test.each([
      [0, "en", "just now"], [0, "vi", "vừa xong"],
      [10 * 60_000, "en", "10m ago"], [10 * 60_000, "vi", "10 phút trước"],
      [5 * 3_600_000, "en", "5h ago"], [5 * 3_600_000, "vi", "5 giờ trước"],
      [10 * 86_400_000, "en", "10d ago"], [10 * 86_400_000, "vi", "10 ngày trước"],
      [60 * 86_400_000, "en", "2mo ago"], [60 * 86_400_000, "vi", "2 tháng trước"],
    ] as const)("age %ims in %s -> %s", (ageMs, locale, expected) => {
      vi.useFakeTimers();
      const now = new Date("2026-06-15T12:00:00.000Z");
      vi.setSystemTime(now);
      expect(timeAgo(new Date(now.getTime() - ageMs).toISOString(), locale)).toBe(expected);
    });
  });
});

describe("login-welcome.ts", () => {
  afterEach(() => sessionStorage.clear());

  test("mark/has/clear round-trips through sessionStorage and is role-specific", () => {
    expect(hasLoginWelcomePending("hr")).toBe(false);
    markLoginWelcomePending("hr");
    expect(hasLoginWelcomePending("hr")).toBe(true);
    expect(hasLoginWelcomePending("admin")).toBe(false);
    clearLoginWelcomePending();
    expect(hasLoginWelcomePending("hr")).toBe(false);
  });
});
