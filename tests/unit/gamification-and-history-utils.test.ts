import { describe, test, expect, vi, afterEach } from "vitest";
import {
  formatXp, getLevelLabel, getLevelColorClass, getLevelBarColor, streakIntensity, xpRewardTypeLabel, timeAgo,
} from "@/features/gamification/utils/gamification-formatters";
import {
  getLoginWelcomeRoleFromRedirect, markLoginWelcomePending, hasLoginWelcomePending, clearLoginWelcomePending,
} from "@/features/auth/utils/login-welcome";
import {
  saveLocalSession, patchLocalSession, updateLocalSessionQuestions, getLocalSessions, getLocalSession, toGenerationSession,
} from "@/features/interview/utils/local-history";

// Grounded in the listed pure-function / localStorage-CRUD modules — no
// rendering needed. New coverage written to broaden the unit-test suite
// beyond the migrated Playwright scenarios (these files had no prior test).

describe("gamification-formatters.ts", () => {
  test("formatXp adds thousands separators", () => {
    expect(formatXp(1200)).toBe("1,200");
    expect(formatXp(0)).toBe("0");
  });

  test.each([
    [1, "Newcomer"], [2, "Newcomer"],
    [3, "Practitioner"], [5, "Practitioner"],
    [6, "Achiever"], [9, "Achiever"],
    [10, "Trailblazer"], [14, "Trailblazer"],
    [15, "Specialist"], [19, "Specialist"],
    [20, "Mentor"], [29, "Mentor"],
    [30, "Legend"], [100, "Legend"],
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
    [0, 0], [1, 1], [2, 1], [3, 2], [6, 2], [7, 3], [30, 3],
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

  test.each([
    ["/candidate", "jobseeker"],
    ["/candidate/", "jobseeker"],
    ["/admin/dashboard", "admin"],
    ["/admin/users", "admin"],
    ["/hr/dashboard", "hr"],
    ["/hr/generate-question", "hr"],
    ["/login", null],
    ["/", null],
  ] as const)("getLoginWelcomeRoleFromRedirect(%s) -> %s", (path, expected) => {
    expect(getLoginWelcomeRoleFromRedirect(path)).toBe(expected);
  });

  test("mark/has/clear round-trips through sessionStorage and is role-specific", () => {
    expect(hasLoginWelcomePending("hr")).toBe(false);
    markLoginWelcomePending("hr");
    expect(hasLoginWelcomePending("hr")).toBe(true);
    expect(hasLoginWelcomePending("admin")).toBe(false);
    clearLoginWelcomePending();
    expect(hasLoginWelcomePending("hr")).toBe(false);
  });
});

describe("local-history.ts", () => {
  afterEach(() => localStorage.clear());

  function baseSession() {
    return {
      jobTitle: "Backend Developer",
      generatedQuestions: [],
      status: "COMPLETED" as const,
      hrOwner: "hr-1",
    };
  }

  test("saveLocalSession assigns an id/timestamps and prepends to the list", () => {
    const s1 = saveLocalSession(baseSession());
    expect(s1.id).toMatch(/^local-/);
    expect(getLocalSessions()).toHaveLength(1);

    const s2 = saveLocalSession({ ...baseSession(), jobTitle: "Frontend Developer" });
    const all = getLocalSessions();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe(s2.id); // most recent first
  });

  test("getLocalSession finds by id, returns null when missing", () => {
    const s1 = saveLocalSession(baseSession());
    expect(getLocalSession(s1.id)?.jobTitle).toBe("Backend Developer");
    expect(getLocalSession("does-not-exist")).toBeNull();
  });

  test("patchLocalSession merges fields for a matching id and no-ops for an unknown id", () => {
    const s1 = saveLocalSession(baseSession());
    patchLocalSession(s1.id, { backendJobId: "job-123" });
    expect(getLocalSession(s1.id)?.backendJobId).toBe("job-123");

    patchLocalSession("does-not-exist", { backendJobId: "job-999" });
    expect(getLocalSessions()).toHaveLength(1);
  });

  test("updateLocalSessionQuestions replaces the question list and bumps updatedAt", () => {
    const s1 = saveLocalSession(baseSession());
    const newQuestions = [{ id: "q1", question: "Explain closures.", questionType: "Technical", difficulty: "Medium" }] as never;
    updateLocalSessionQuestions(s1.id, newQuestions);
    const updated = getLocalSession(s1.id)!;
    expect(updated.generatedQuestions).toEqual(newQuestions);
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(s1.updatedAt).getTime());
  });

  test("toGenerationSession maps every field 1:1", () => {
    const s1 = saveLocalSession(baseSession());
    const gs = toGenerationSession(s1);
    expect(gs).toMatchObject({
      id: s1.id, jobTitle: s1.jobTitle, status: "COMPLETED", hrOwner: "hr-1",
    });
  });

  test("a malformed localStorage entry is treated as an empty list instead of throwing", () => {
    localStorage.setItem("hiregen_generation_history", "{not valid json");
    expect(getLocalSessions()).toEqual([]);
  });
});
