import { describe, test, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { QuestionBuilderPage } from "@/features/interview/components/generate/question-builder-page";

// Grounded in src/core/auth/permissions.ts (role is read/written via plain
// localStorage, with no accompanying route guard anywhere under src/app/hr)
// contrasted with admin-access-control.test.tsx's AdminRouteGuard, which
// DOES check role and redirect for /admin/*. Maps to Excel sheet
// NoRoleGateOnHrRoutes (RGA008). Unit-test rewrite of
// auth-error-handling.spec.ts's RGA008-1 — the interceptor-level scenarios
// from that file (401/refresh/redirect/dedup/rotation) were already
// redundant with auth-interceptor.test.ts and error-interceptor.test.ts,
// which test the same axios interceptor logic directly; this is the one
// scenario from that file with no existing unit coverage.

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/hr/services/hr-history.service", () => ({
  listHistoryQuestionSets: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/interview/services/interview.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/interview/services/interview.service")>();
  return {
    ...actual,
    addQuestionSetQuestion: vi.fn(),
    createManualDraftQuestionSet: vi.fn(),
    uploadQuestionSetQuestionImage: vi.fn(),
  };
});

beforeEach(() => {
  push.mockClear();
});

describe("RGA008 — HR routes have no role gate", () => {
  test("RGA008-1 (finding): a Jobseeker-role session still renders an HR page normally, with no redirect", async () => {
    // Contrast with AdminRouteGuard (admin-access-control.test.tsx), which
    // DOES redirect a non-Admin role away from /admin/*. No equivalent
    // guard component exists anywhere under src/app/hr — the page renders
    // unconditionally regardless of interviewai_user_role.
    localStorage.setItem("interviewai_auth", "true");
    localStorage.setItem("interviewai_user_role", "JOB_SEEKER");
    localStorage.setItem("interviewai_access_token", "fake.jwt.token-for-tests");

    renderWithProviders(<QuestionBuilderPage />);

    expect(await screen.findByRole("heading", { name: "Create questions manually" }, { timeout: 10000 })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
