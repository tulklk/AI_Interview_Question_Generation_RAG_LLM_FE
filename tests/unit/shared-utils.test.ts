import { describe, test, expect, vi, afterEach } from "vitest";
import { getTimeOfDayGreeting, buildWelcomeMessage } from "@/shared/utils/greeting";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import { normalizePathname, isAdminNavActive, isHrNavActive } from "@/shared/utils/nav";
import { getInitials, resolveAvatarUrl } from "@/shared/utils/user-display";
import { isValidUrl } from "@/shared/utils/url-validation";
import { mapAvatarUploadError } from "@/shared/utils/avatar-upload-messages";

// Grounded in src/shared/utils/{greeting,relative-time,nav,user-display,
// url-validation,avatar-upload-messages}.ts — pure functions with no
// rendering/mocking needed. New coverage (not a Playwright rewrite) written
// to broaden the unit-test suite beyond the migrated E2E scenarios.

const LABELS = { morning: "Morning", afternoon: "Afternoon", evening: "Evening", night: "Night" };

describe("greeting.ts", () => {
  test.each([
    [5, "Morning"], [11, "Morning"],
    [12, "Afternoon"], [17, "Afternoon"],
    [18, "Evening"], [21, "Evening"],
    [22, "Night"], [4, "Night"], [0, "Night"],
  ])("getTimeOfDayGreeting: hour %i -> %s", (hour, expected) => {
    const d = new Date(2026, 0, 1, hour, 0, 0);
    expect(getTimeOfDayGreeting(LABELS, d)).toBe(expected);
  });

  test("buildWelcomeMessage substitutes both placeholders", () => {
    expect(buildWelcomeMessage("{{greeting}}, {{name}}!", "Good morning", "An")).toBe("Good morning, An!");
  });

  test("buildWelcomeMessage leaves template untouched when placeholders are absent", () => {
    expect(buildWelcomeMessage("Hello there", "Good morning", "An")).toBe("Hello there");
  });
});

describe("relative-time.ts", () => {
  afterEach(() => vi.useRealTimers());

  test("returns empty string for an undefined/invalid date", () => {
    expect(formatRelativeTime(undefined, "en")).toBe("");
    expect(formatRelativeTime("not-a-date", "en")).toBe("");
  });

  test.each([
    [0, "en", "Just now"], [0, "vi", "Vừa xong"],
    [5 * 60_000, "en", "5 min ago"], [5 * 60_000, "vi", "5 phút trước"],
    [3 * 3_600_000, "en", "3h ago"], [3 * 3_600_000, "vi", "3 giờ trước"],
    [2 * 86_400_000, "en", "2d ago"], [2 * 86_400_000, "vi", "2 ngày trước"],
  ] as const)("age %ims in %s -> %s", (ageMs, lang, expected) => {
    vi.useFakeTimers();
    const now = new Date("2026-06-15T12:00:00.000Z");
    vi.setSystemTime(now);
    const then = new Date(now.getTime() - ageMs).toISOString();
    expect(formatRelativeTime(then, lang)).toBe(expected);
  });
});

describe("nav.ts", () => {
  test("normalizePathname strips a trailing slash but keeps bare '/'", () => {
    expect(normalizePathname("/hr/dashboard/")).toBe("/hr/dashboard");
    expect(normalizePathname("/hr/dashboard")).toBe("/hr/dashboard");
    expect(normalizePathname("/")).toBe("/");
  });

  test("isAdminNavActive treats /admin as equivalent to /admin/dashboard", () => {
    expect(isAdminNavActive("/admin/dashboard", "/admin")).toBe(true);
    expect(isAdminNavActive("/admin/dashboard", "/admin/dashboard")).toBe(true);
    expect(isAdminNavActive("/admin/dashboard", "/admin/users")).toBe(false);
    expect(isAdminNavActive("/admin/users", "/admin/users/")).toBe(true);
  });

  test.each([
    ["/hr/dashboard", "/hr", true],
    ["/hr/dashboard", "/hr/dashboard", true],
    ["/hr/settings", "/hr/settings", true],
    ["/hr/settings", "/hr/settings/billing", false],
    ["/hr/history", "/hr/history/qs-1", true],
    ["/hr/history", "/hr/history", true],
    ["/hr/generate-question", "/hr/generate-question/manual", true],
    ["/hr/generate-question", "/hr/generate-question", true],
    ["/hr/generate-question", "/hr/history", false],
  ])("isHrNavActive(%s, %s) -> %s", (href, pathname, expected) => {
    expect(isHrNavActive(href, pathname)).toBe(expected);
  });
});

describe("user-display.ts", () => {
  test("getInitials handles empty, single-word, and multi-word names", () => {
    expect(getInitials("")).toBe("??");
    expect(getInitials("   ")).toBe("??");
    expect(getInitials("Madonna")).toBe("MA");
    expect(getInitials("Nguyen Van A")).toBe("NA");
    expect(getInitials("  Nguyen   Van A  ")).toBe("NA");
  });

  test("resolveAvatarUrl returns null for a null/undefined user", () => {
    expect(resolveAvatarUrl(null)).toBeNull();
    expect(resolveAvatarUrl(undefined)).toBeNull();
  });

  test("resolveAvatarUrl prefers user.avatarUrl, then candidateProfile, then hrProfile", () => {
    expect(resolveAvatarUrl({ avatarUrl: "top.png", candidateProfile: { avatarUrl: "c.png" }, hrProfile: null } as never))
      .toBe("top.png");
    expect(resolveAvatarUrl({ avatarUrl: null, candidateProfile: { avatarUrl: "c.png" }, hrProfile: null } as never))
      .toBe("c.png");
    expect(resolveAvatarUrl({ avatarUrl: null, candidateProfile: null, hrProfile: { avatarUrl: "h.png" } } as never))
      .toBe("h.png");
    expect(resolveAvatarUrl({ avatarUrl: "  ", candidateProfile: null, hrProfile: null } as never)).toBeNull();
  });
});

describe("url-validation.ts", () => {
  test("empty/whitespace input is treated as valid (optional field)", () => {
    expect(isValidUrl("")).toBe(true);
    expect(isValidUrl("   ")).toBe(true);
  });

  test.each([
    ["https://example.com", true],
    ["http://example.com/path?x=1", true],
    ["ftp://example.com", false],
    ["not a url", false],
    ["javascript:alert(1)", false],
  ])("isValidUrl(%s) -> %s", (val, expected) => {
    expect(isValidUrl(val)).toBe(expected);
  });
});

describe("avatar-upload-messages.ts", () => {
  const messages = { uploadPhotoFailed: "Upload failed.", invalidPhotoType: "Invalid type.", photoTooLarge: "Too large." };

  test.each([
    ["invalid_type", "Invalid type."],
    ["too_large", "Too large."],
    ["unknown_code", "Upload failed."],
    ["", "Upload failed."],
  ])("mapAvatarUploadError(%s)", (code, expected) => {
    expect(mapAvatarUploadError(code, messages)).toBe(expected);
  });
});
