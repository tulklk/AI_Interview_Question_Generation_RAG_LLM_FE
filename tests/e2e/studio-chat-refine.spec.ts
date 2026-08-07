import { test, expect, toast, mockHrSession, freeSubscriptionReady, type Page } from "./fixtures";

// Grounded in src/features/studio/hooks/use-studio.ts's sendMessage (calls
// studioApi.refinePlan per turn, no SSE — SCRUM-368) and
// src/features/studio/components/chat-panel.tsx's AiAssistantTab (composer
// locked once plan.status === "Approved"). Maps to Excel sheet RAG032
// (multi-turn chat refine). Route: /hr/generate-v2.

const PROJECT_ID = "proj-1";

function draftPlan(overrides: Record<string, unknown> = {}) {
  return {
    id: "plan-1", projectId: PROJECT_ID, revision: 1, title: "Senior Backend Developer Interview Plan",
    status: "Refining", totalQuestions: 10, interviewLengthMinutes: 60, difficulty: "Medium",
    difficultyMix: { easy: 4, medium: 4, hard: 2 }, focusAreas: [], sourcesUsed: [],
    estimatedSections: [], sections: [], concurrencyVersion: "v1",
    ...overrides,
  };
}

function readySettings(overrides: Record<string, unknown> = {}) {
  return {
    projectId: PROJECT_ID,
    appliedPlanId: "plan-1",
    interviewLengthMinutes: 60,
    numberOfQuestions: 10,
    difficulty: "Medium",
    questionTone: "Professional",
    includeSampleAnswers: true,
    includeScoringRubric: true,
    outputFormat: "StructuredInterviewKit",
    outputLanguage: "Vietnamese",
    questionTypes: ["technical", "system_design", "problem_solving", "behavioral"],
    readiness: {
      hasJobDescription: true,
      hasSelectedDocument: false,
      hasAwaitingApprovalPlan: false,
      hasApprovedPlan: true,
      canGenerateQuestions: true,
    },
    ...overrides,
  };
}

async function mockStudioBootstrap(page: Page, plan: unknown) {
  await page.route("**/api/studio/projects", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: PROJECT_ID, name: "Interview Plan Studio" }]) });
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/job-description`, (route) => route.fulfill({ status: 404, contentType: "application/json", body: "{}" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/knowledge-documents`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans/current`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(plan) })
  );
  await page.route(`**/api/studio/projects/${PROJECT_ID}/settings`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(readySettings()) })
  );
  await page.route(`**/api/studio/projects/${PROJECT_ID}/chat/messages`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/question-generation-runs`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  // bootstrap() always calls listQuestions() once a plan exists — without a
  // real {page,pageSize,total,items} shape here, the request falls through to
  // the "**/api/**" catch-all's raw "{}" body, so qs.items is undefined and
  // setQuestions(undefined) later crashes on questions.length downstream.
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions?*`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 100, total: 0, items: [] }) })
  );
}

test("RAG032-1: two sequential chat refinements each call refinePlan and both messages accumulate in history", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page, draftPlan());

  // Stateful: after each successful refine, sendMessage() calls
  // refreshStudioState() -> refreshMessages() -> GET chat/messages, which
  // OVERWRITES the locally-added optimistic bubble with whatever the server
  // says. A real backend persists the just-sent turn by then, so the mock
  // must too, or the just-sent message would visibly vanish right after the
  // "Plan refined." toast — not a reflection of real behavior.
  const refineCalls: string[] = [];
  const serverMessages: Array<{ id: string; sessionId: string; role: string; content: string; status: string; createdAt: string }> = [];
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans/plan-1/refine`, (route) => {
    const body = route.request().postDataJSON() as { instruction: string };
    refineCalls.push(body.instruction);
    serverMessages.push({ id: `m-${refineCalls.length}`, sessionId: "", role: "User", content: body.instruction, status: "Completed", createdAt: new Date().toISOString() });
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(draftPlan({ revision: refineCalls.length + 1 })) });
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/chat/messages`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(serverMessages) })
  );

  await page.goto("/hr/generate-v2");
  await page.getByRole("button", { name: "AI Assistant" }).click();
  const composer = page.getByPlaceholder("Ask AI to refine the plan…");
  await expect(composer).toBeVisible({ timeout: 10000 });

  await composer.fill("Add more system design questions.");
  await composer.press("Enter");
  await expect(toast(page, "Plan refined.")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Add more system design questions.")).toBeVisible();

  await composer.fill("Make the tone more casual.");
  await composer.press("Enter");
  await expect(toast(page, "Plan refined.").last()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Make the tone more casual.")).toBeVisible();

  // Both turns are still in the transcript — chat history isn't cleared between turns.
  await expect(page.getByText("Add more system design questions.")).toBeVisible();
  expect(refineCalls).toEqual(["Add more system design questions.", "Make the tone more casual."]);
});

test("RAG032-2: once the plan is Approved, the chat composer is locked with a distinct placeholder", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page, draftPlan({ status: "Approved" }));

  await page.goto("/hr/generate-v2");
  await page.getByRole("button", { name: "AI Assistant" }).click();
  const composer = page.getByPlaceholder("Chat locked after plan approval");
  await expect(composer).toBeVisible({ timeout: 10000 });
  await expect(composer).toBeDisabled();
  await expect(page.getByPlaceholder("Ask AI to refine the plan…")).toHaveCount(0);
});
