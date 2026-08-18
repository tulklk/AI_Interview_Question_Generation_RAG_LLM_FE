import { describe, test, expect, afterEach } from "vitest";
import {
  setAuth, clearAuth, isAuthenticated, setUserRole, getUserRole, getRoleRedirect, extractRole,
} from "@/core/auth/permissions";
import { setAuthTokens, getAccessToken } from "@/core/auth/token.service";
import { setCachedUserProfile, getCachedUserProfile } from "@/core/storage/user-profile-cache";
import {
  isJdCitation, sortCitationsPrimaryFirst, citationsForDisplay, formatCitationExcerpt, citationDisplayName,
} from "@/features/studio/utils/citation-display";

// Grounded in src/core/auth/permissions.ts and
// src/features/studio/utils/citation-display.ts — localStorage-backed auth
// state and pure citation-formatting helpers, both previously only
// exercised indirectly (via mocks) by other tests, never as real functions.

function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/=+$/, "");
  return `${b64({ alg: "none" })}.${b64(payload)}.sig`;
}

describe("permissions.ts", () => {
  afterEach(() => {
    localStorage.clear();
  });

  test("setAuth/isAuthenticated/clearAuth round-trip via the legacy mock flag", () => {
    expect(isAuthenticated()).toBe(false);
    setAuth();
    expect(isAuthenticated()).toBe(true);
    clearAuth();
    expect(isAuthenticated()).toBe(false);
  });

  test("isAuthenticated is also true when a real access token is present, without the legacy flag", () => {
    setAuthTokens("real.jwt.token");
    expect(isAuthenticated()).toBe(true);
  });

  test("setUserRole/getUserRole round-trip", () => {
    expect(getUserRole()).toBeNull();
    setUserRole("HR_MANAGER");
    expect(getUserRole()).toBe("HR_MANAGER");
  });

  test("clearAuth clears the role, tokens, and the cached user profile together", () => {
    setAuth();
    setUserRole("ADMIN");
    setAuthTokens("acc", "ref");
    setCachedUserProfile({ fullName: "A", email: "a@x.com" });

    clearAuth();

    expect(getUserRole()).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getCachedUserProfile()).toBeNull();
  });

  test.each([
    ["ADMIN", "/admin/dashboard"],
    ["SUPER_ADMIN", "/admin/dashboard"],
    ["HR_MANAGER", "/hr/dashboard"],
    ["JOB_SEEKER", "/candidate"],
    [null, "/candidate"],
  ] as const)("getRoleRedirect(%s) -> %s", (role, expected) => {
    expect(getRoleRedirect(role)).toBe(expected);
  });

  test("extractRole reads a direct role field", () => {
    expect(extractRole({ role: "HR_MANAGER" })).toBe("HR_MANAGER");
  });

  test("extractRole reads a role field nested under data.data", () => {
    expect(extractRole({ data: { role: "ADMIN" } })).toBe("ADMIN");
  });

  test.each(["accessToken", "access_token", "token"])(
    "extractRole decodes the role out of a JWT payload under '%s'",
    (field) => {
      const token = fakeJwt({ role: "JOB_SEEKER" });
      expect(extractRole({ [field]: token })).toBe("JOB_SEEKER");
    }
  );

  test("extractRole falls back to the Role (capitalized) JWT claim", () => {
    const token = fakeJwt({ Role: "HR_MANAGER" });
    expect(extractRole({ accessToken: token })).toBe("HR_MANAGER");
  });

  test("extractRole returns null for a malformed token instead of throwing", () => {
    expect(extractRole({ accessToken: "not-a-jwt" })).toBeNull();
  });

  test("extractRole returns null for non-object or role-less input", () => {
    expect(extractRole(null)).toBeNull();
    expect(extractRole("a string")).toBeNull();
    expect(extractRole({})).toBeNull();
  });
});

describe("citation-display.ts", () => {
  test.each([
    ["job-description", true], ["jd", true], ["Job Description", true], ["job_description", true],
    ["handbook.pdf", false], [null, false], [undefined, false], ["", false],
  ] as const)("isJdCitation(%s) -> %s", (sourceFile, expected) => {
    expect(isJdCitation(sourceFile)).toBe(expected);
  });

  test("sortCitationsPrimaryFirst puts the JD citation ahead of KB sources, preserving relative order otherwise", () => {
    const citations = [
      { sourceFile: "handbook.pdf", chunkIndex: 0, excerpt: "a" },
      { sourceFile: "job-description", chunkIndex: 0, excerpt: "b" },
      { sourceFile: "policy.pdf", chunkIndex: 1, excerpt: "c" },
    ];
    expect(sortCitationsPrimaryFirst(citations).map((c) => c.sourceFile)).toEqual([
      "job-description", "handbook.pdf", "policy.pdf",
    ]);
  });

  test("sortCitationsPrimaryFirst handles empty/null input", () => {
    expect(sortCitationsPrimaryFirst(null)).toEqual([]);
    expect(sortCitationsPrimaryFirst([])).toEqual([]);
  });

  test("citationsForDisplay injects a synthetic JD row (empty excerpt) when none is present", () => {
    const result = citationsForDisplay([{ sourceFile: "handbook.pdf", chunkIndex: 0, excerpt: "a" }]);
    expect(result[0]).toEqual({ sourceFile: "job-description", chunkIndex: 0, excerpt: null });
    expect(result).toHaveLength(2);
  });

  test("citationsForDisplay does not duplicate the JD row when one already exists", () => {
    const result = citationsForDisplay([{ sourceFile: "job-description", chunkIndex: 0, excerpt: "real excerpt" }]);
    expect(result).toHaveLength(1);
    expect(result[0].excerpt).toBe("real excerpt");
  });

  test("formatCitationExcerpt trims, truncates with an ellipsis past the max length, and nulls out blank text", () => {
    expect(formatCitationExcerpt("  short text  ")).toBe("short text");
    expect(formatCitationExcerpt(null)).toBeNull();
    expect(formatCitationExcerpt("   ")).toBeNull();
    const long = "x".repeat(200);
    expect(formatCitationExcerpt(long, 140)).toBe(`${"x".repeat(140)}…`);
  });

  test("citationDisplayName shows the JD label for a JD source and the raw filename otherwise", () => {
    const labels = { jobDescription: "Job Description" };
    expect(citationDisplayName("job-description", labels)).toBe("Job Description");
    expect(citationDisplayName("handbook.pdf", labels)).toBe("handbook.pdf");
  });
});
