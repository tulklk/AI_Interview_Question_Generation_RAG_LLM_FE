import { test, expect, toast, mockHrSession, freeSubscriptionReady, type Page } from "./fixtures";

// Grounded in src/features/studio/components/sources-panel.tsx's library
// picker (togglePick gates on !alreadyAttached && status === "COMPLETED") and
// src/features/studio/hooks/use-studio.ts's attachLibraryDocuments. Maps to
// Excel sheet RAG031 (KB doc library attach-vs-upload). Route: /hr/generate-v2.

const PROJECT_ID = "proj-1";

async function mockStudioBootstrapNoJd(page: Page) {
  await page.route("**/api/studio/projects", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: PROJECT_ID, name: "Interview Plan Studio" }]) });
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/job-description`, (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
  );
  await page.route(`**/api/studio/projects/${PROJECT_ID}/knowledge-documents`, (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans/current`, (route) => route.fulfill({ status: 204, body: "" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/settings`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/chat/messages`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/question-generation-runs`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
}

test.beforeEach(async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrapNoJd(page);
  await page.route(`**/api/studio/projects/${PROJECT_ID}/knowledge-documents/library`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { knowledgeDocumentId: "kd-1", fileName: "backend-handbook.pdf", status: "COMPLETED", chunkCount: 12, createdAt: new Date().toISOString(), alreadyAttached: false },
        { knowledgeDocumentId: "kd-2", fileName: "already-in-project.pdf", status: "COMPLETED", chunkCount: 5, createdAt: new Date().toISOString(), alreadyAttached: true },
        { knowledgeDocumentId: "kd-3", fileName: "still-ingesting.pdf", status: "PROCESSING", chunkCount: 0, createdAt: new Date().toISOString(), alreadyAttached: false },
      ]),
    })
  );
  await page.goto("/hr/generate-v2");
  await page.getByRole("button", { name: "From KB" }).click();
  await expect(page.getByText("Select from Knowledge Base")).toBeVisible({ timeout: 10000 });
});

test("RAG031-1: an already-attached document shows \"Attached\" and cannot be re-picked", async ({ page }) => {
  const row = page.getByRole("button", { name: /already-in-project\.pdf/ });
  await expect(row).toBeVisible();
  await expect(row).toBeDisabled();
  await expect(row.getByText("Attached")).toBeVisible();
});

test("RAG031-2: a still-processing (non-COMPLETED) document is not selectable either", async ({ page }) => {
  const row = page.getByRole("button", { name: /still-ingesting\.pdf/ });
  await expect(row).toBeVisible();
  await expect(row).toBeDisabled();
  await expect(row.getByText("PROCESSING")).toBeVisible();
});

test("RAG031-3: picking a COMPLETED, not-yet-attached doc and clicking Attach calls the attach endpoint with its id", async ({ page }) => {
  let attachBody: Record<string, unknown> | null = null;
  await page.route(`**/api/studio/projects/${PROJECT_ID}/knowledge-documents/attach`, (route) => {
    attachBody = route.request().postDataJSON();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: "kd-1", fileName: "backend-handbook.pdf", fileType: "pdf", fileSize: 1000, isSelected: true, status: "Completed" }]),
    });
  });

  const row = page.getByRole("button", { name: /backend-handbook\.pdf/ });
  await expect(row).toBeEnabled();
  await row.click();
  await expect(page.getByText("Selected 1/1")).toBeVisible(); // attachableCount excludes the attached + still-processing docs

  await page.getByRole("button", { name: "Attach 1 doc(s)" }).click();
  await expect(toast(page, "1 document(s) attached from Knowledge Base.")).toBeVisible({ timeout: 10000 });
  expect((attachBody as unknown as { knowledgeDocumentIds?: string[] })?.knowledgeDocumentIds).toEqual(["kd-1"]);
});
