import { describe, test, expect } from "vitest";
import { AvatarUploadError, validateAvatarFile } from "@/shared/utils/cloudinary";
import { computeStreakDays } from "@/features/candidate/utils/practice-streak";
import { translateDimensionKey, translateQuestionCategory } from "@/features/candidate/utils/skill-labels";
import { getCompanyInitials, getCompanyColor } from "@/features/candidate/utils/company-visual";
import { toBackendRoleFilter, normalizeAdminRoleKey, getAdminUserStatus, isAdminRole } from "@/features/admin/utils/admin-user-display";
import { getDifficultyBadgeClass, getCategoryBadgeClass, formatCategoryLabel, getScoreBadgeClass, getScoreLevel } from "@/features/candidate/components/ui/pill";

// Grounded in the listed pure-function modules — no rendering/mocking
// needed. New coverage written to broaden the unit-test suite beyond the
// migrated Playwright scenarios (these files had no prior test at all).

describe("cloudinary.ts — validateAvatarFile", () => {
  test("accepts an allowed image type under the size cap", () => {
    const file = new File([new Uint8Array(1024)], "a.png", { type: "image/png" });
    expect(() => validateAvatarFile(file)).not.toThrow();
  });

  test("rejects a disallowed mime type", () => {
    const file = new File(["x"], "a.pdf", { type: "application/pdf" });
    expect(() => validateAvatarFile(file)).toThrow(AvatarUploadError);
    try {
      validateAvatarFile(file);
    } catch (e) {
      expect((e as Error).message).toBe("invalid_type");
    }
  });

  test("rejects a file over the 2MB cap", () => {
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "a.png", { type: "image/png" });
    expect(() => validateAvatarFile(big)).toThrow(AvatarUploadError);
    try {
      validateAvatarFile(big);
    } catch (e) {
      expect((e as Error).message).toBe("too_large");
    }
  });
});

describe("practice-streak.ts — computeStreakDays", () => {
  function daysAgoIso(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  test("no sessions -> 0", () => {
    expect(computeStreakDays([])).toBe(0);
  });

  test("only today -> streak of 1", () => {
    expect(computeStreakDays([daysAgoIso(0)])).toBe(1);
  });

  test("today + yesterday + 2 days ago -> streak of 3", () => {
    expect(computeStreakDays([daysAgoIso(0), daysAgoIso(1), daysAgoIso(2)])).toBe(3);
  });

  test("a gap breaks the streak", () => {
    expect(computeStreakDays([daysAgoIso(0), daysAgoIso(2)])).toBe(1);
  });

  test("no session today, but one yesterday, still anchors the streak", () => {
    expect(computeStreakDays([daysAgoIso(1), daysAgoIso(2)])).toBe(2);
  });

  test("a gap of 2+ days (nothing today or yesterday) -> streak of 0", () => {
    expect(computeStreakDays([daysAgoIso(3)])).toBe(0);
  });

  test("ignores undefined/malformed entries", () => {
    expect(computeStreakDays([undefined, "not-a-date", daysAgoIso(0)])).toBe(1);
  });

  test("duplicate timestamps on the same day count once", () => {
    expect(computeStreakDays([daysAgoIso(0), daysAgoIso(0)])).toBe(1);
  });
});

describe("skill-labels.ts", () => {
  test("translateDimensionKey returns the Vietnamese label for a known key, normalized", () => {
    expect(translateDimensionKey("technical_accuracy", "vi")).toBe("Độ chính xác kỹ thuật");
    expect(translateDimensionKey("Technical-Accuracy", "vi")).toBe("Độ chính xác kỹ thuật");
  });

  test("translateDimensionKey falls back to formatCategoryLabel for an unknown key or English locale", () => {
    expect(translateDimensionKey("some_new_dimension", "vi")).toBe("Some New Dimension");
    expect(translateDimensionKey("clarity", "en")).toBe("Clarity");
  });

  test("translateQuestionCategory maps known categories in Vietnamese and falls back otherwise", () => {
    expect(translateQuestionCategory("problem-solving", "vi")).toBe("Giải quyết vấn đề");
    expect(translateQuestionCategory("unknown-cat", "vi")).toBe("Unknown Cat");
    expect(translateQuestionCategory("technical", "en")).toBe("Technical");
  });
});

describe("company-visual.ts", () => {
  test("getCompanyInitials handles empty, single-word, and multi-word names", () => {
    expect(getCompanyInitials("")).toBe("?");
    expect(getCompanyInitials("   ")).toBe("?");
    expect(getCompanyInitials("Acme")).toBe("AC");
    expect(getCompanyInitials("Acme Corp International")).toBe("AC");
  });

  test("getCompanyColor is deterministic for the same seed and picks from the fixed palette", () => {
    const c1 = getCompanyColor("Acme Corp");
    const c2 = getCompanyColor("Acme Corp");
    expect(c1).toBe(c2);
    expect(c1).toMatch(/^bg-\w+-500$/);
  });

  test("getCompanyColor generally differs for different seeds", () => {
    expect(getCompanyColor("Acme")).not.toBe(getCompanyColor("Zephyr Industries"));
  });
});

describe("admin-user-display.ts", () => {
  test.each([
    ["ADMIN", "Admin"], ["HR_MANAGER", "HR"], ["JOB_SEEKER", "Candidate"], ["UNKNOWN", undefined],
  ] as const)("toBackendRoleFilter(%s) -> %s", (roleKey, expected) => {
    expect(toBackendRoleFilter(roleKey)).toBe(expected);
  });

  test.each([
    ["ADMIN", "ADMIN"], ["SysAdmin", "ADMIN"],
    ["HR_MANAGER", "HR_MANAGER"], ["Recruiter", "HR_MANAGER"],
    ["JOB_SEEKER", "JOB_SEEKER"], ["Candidate", "JOB_SEEKER"], ["JobSeeker", "JOB_SEEKER"],
    ["something-else", "UNKNOWN"], [undefined, "UNKNOWN"],
  ] as const)("normalizeAdminRoleKey(%s) -> %s", (role, expected) => {
    expect(normalizeAdminRoleKey(role)).toBe(expected);
  });

  test.each([
    [{ isActive: false, emailVerified: true }, "Suspended"],
    [{ isActive: true, emailVerified: false }, "Pending"],
    [{ isActive: true, emailVerified: true }, "Active"],
    // isActive=false takes priority over an unverified email
    [{ isActive: false, emailVerified: false }, "Suspended"],
  ] as const)("getAdminUserStatus(%o) -> %s", (user, expected) => {
    expect(getAdminUserStatus(user)).toBe(expected);
  });

  test("isAdminRole is case-insensitive and null-safe", () => {
    expect(isAdminRole("ADMIN")).toBe(true);
    expect(isAdminRole("SuperAdmin")).toBe(true);
    expect(isAdminRole("HR_MANAGER")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
});

describe("pill.tsx — pure helpers", () => {
  test("getDifficultyBadgeClass covers all three difficulty levels", () => {
    expect(getDifficultyBadgeClass("Easy")).toContain("emerald");
    expect(getDifficultyBadgeClass("Medium")).toContain("amber");
    expect(getDifficultyBadgeClass("Hard")).toContain("red");
  });

  test("getCategoryBadgeClass is case-insensitive and falls back for unknown categories", () => {
    expect(getCategoryBadgeClass("Technical" as never)).toContain("blue");
    expect(getCategoryBadgeClass("system-design" as never)).toContain("cyan");
    expect(getCategoryBadgeClass("some-unknown-type" as never)).toContain("gray");
  });

  test("formatCategoryLabel title-cases hyphen/underscore/space-separated words", () => {
    expect(formatCategoryLabel("problem-solving" as never)).toBe("Problem Solving");
    expect(formatCategoryLabel("system_design" as never)).toBe("System Design");
    expect(formatCategoryLabel("technical" as never)).toBe("Technical");
  });

  test("getScoreBadgeClass thresholds at 80 and 65", () => {
    expect(getScoreBadgeClass(85)).toContain("emerald");
    expect(getScoreBadgeClass(80)).toContain("emerald");
    expect(getScoreBadgeClass(70)).toContain("violet");
    expect(getScoreBadgeClass(65)).toContain("violet");
    expect(getScoreBadgeClass(40)).toContain("amber");
  });

  const LEVEL_LABELS = { excellent: "Excellent", good: "Good", fair: "Fair", needsWork: "Needs work" };

  test("getScoreLevel derives label and badge color from the same thresholds (80/65/50)", () => {
    expect(getScoreLevel(90, LEVEL_LABELS)).toEqual({ label: "Excellent", badgeClass: expect.stringContaining("emerald") });
    expect(getScoreLevel(70, LEVEL_LABELS)).toEqual({ label: "Good", badgeClass: expect.stringContaining("violet") });
    expect(getScoreLevel(55, LEVEL_LABELS)).toEqual({ label: "Fair", badgeClass: expect.stringContaining("amber") });
    expect(getScoreLevel(30, LEVEL_LABELS)).toEqual({ label: "Needs work", badgeClass: expect.stringContaining("red") });
  });
});
