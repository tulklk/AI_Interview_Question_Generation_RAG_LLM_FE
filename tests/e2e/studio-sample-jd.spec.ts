import { test, expect, mockHrSession, freeSubscriptionReady, type Page } from "./fixtures";

// Grounded in src/features/studio/components/sources-panel.tsx's SampleJdModal
// and src/features/studio/hooks/use-studio.ts's saveJobDescription. Maps to
// Excel sheet RAG027 (Sample JD modal). Route: /hr/generate-v2, Draft project
// (no JD yet, so the Sources panel is unlocked).

const PROJECT_ID = "proj-1";
const SAMPLE_JD_SNIPPET = "Chúng tôi đang tìm kiếm một Fullstack Developer";

async function mockStudioBootstrapNoJd(page: Page) {
  await page.route("**/api/studio/projects", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: PROJECT_ID, name: "Interview Plan Studio" }]) });
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/job-description`, (route) => {
    if (route.request().method() === "GET") return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
    route.fallback();
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/knowledge-documents`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans/current`, (route) => route.fulfill({ status: 204, body: "" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/settings`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/chat/messages`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/question-generation-runs`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
}

test.beforeEach(async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrapNoJd(page);
  await page.goto("/hr/generate-v2");
  await page.getByRole("button", { name: "Sample JD" }).click();
  await expect(page.getByText(SAMPLE_JD_SNIPPET)).toBeVisible({ timeout: 10000 });
});

test("RAG027-1 (finding): \"Use this sample\" fills the JD textarea but does NOT persist it — a stale-closure bug", async ({ page }) => {
  // sources-panel.tsx's onUse handler calls onJdChange(content) then
  // immediately void onSaveJd() in the same synchronous callback. onSaveJd is
  // studio.saveJobDescription, a useCallback memoized on [..., jdContent, ...]
  // from use-studio.ts — the reference captured by SampleJdModal's onUse prop
  // at render time still closes over the OLD (empty) jdContent, so its guard
  // `if (!project || !jdContent.trim()) return;` fires and no PUT ever goes
  // out. Verified directly: no request to job-description follows the click,
  // and no "Job description saved and analyzed." toast appears.
  let jdSaved = false;
  await page.route(`**/api/studio/projects/${PROJECT_ID}/job-description`, (route) => {
    if (route.request().method() === "PUT") {
      jdSaved = true;
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (route.request().method() === "GET") return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
    route.fallback();
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/job-description/analyze`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ detectedRole: "Fullstack Developer", skills: [] }) })
  );

  await page.getByRole("button", { name: "Use this sample" }).click();
  await expect(page.getByPlaceholder("Paste your job description here…")).toHaveValue(new RegExp(SAMPLE_JD_SNIPPET), { timeout: 5000 });
  await expect(page.getByText("Use this sample")).not.toBeVisible(); // modal itself closed

  await page.waitForTimeout(1500); // give the (absent) save request a fair chance to arrive
  expect(jdSaved).toBe(false); // reproduces the bug — flip to true if it's ever fixed
  await expect(page.getByText("Job description saved and analyzed.")).not.toBeVisible();

  // The user must click "Save & Analyze" a second time, manually — at that
  // point the button's onClick reads the current (non-stale) onSaveJd, and it
  // works correctly.
  await page.getByRole("button", { name: "Save & Analyze" }).click();
  await expect(page.getByText("Job description saved and analyzed.")).toBeVisible({ timeout: 5000 });
  expect(jdSaved).toBe(true);
});

test("RAG027-2: the close (X) button dismisses the modal without touching the JD field", async ({ page }) => {
  await page.locator("div.fixed.inset-0.z-\\[200\\]").getByRole("button").first().click();
  await expect(page.getByText("Use this sample")).not.toBeVisible({ timeout: 5000 });
  await expect(page.getByPlaceholder("Paste your job description here…")).toHaveValue("");
});

test("RAG027-3: clicking the backdrop also dismisses the modal", async ({ page }) => {
  await page.mouse.click(5, 5);
  await expect(page.getByText("Use this sample")).not.toBeVisible({ timeout: 5000 });
});

test("RAG027-4 (finding): pressing Escape does NOT close the Sample JD modal — unlike the HR upgrade modal", async ({ page }) => {
  // SampleJdModal registers no keydown listener at all (contrast with
  // hr-upgrade-modal.tsx's `onKey` Escape handler) — an inconsistency in modal
  // dismissal behavior across the app.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await expect(page.getByText("Use this sample")).toBeVisible();
});

test("RAG027-5: the Copy button copies the sample JD to the clipboard and shows \"Copied\" feedback that reverts", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const copyBtn = page.getByRole("button", { name: "Copy" });
  await expect(copyBtn).toBeVisible();

  await copyBtn.click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible({ timeout: 5000 });
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toContain(SAMPLE_JD_SNIPPET);

  // Reverts back to "Copy" after the 1.8s feedback window, and the modal is
  // still open (Copy doesn't close it, unlike "Use this sample").
  await expect(page.getByRole("button", { name: "Copy" })).toBeVisible({ timeout: 3000 });
  await expect(page.getByText("Use this sample")).toBeVisible();
});
