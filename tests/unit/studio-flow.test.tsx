import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
import {
  PROJECT_ID,
  studioServiceMockFactory,
  bootstrapStudio,
  freeSubscriptionReady,
  readySettings,
  draftPlan,
  question,
  renderStudio,
  getMockedGetMySubscription,
} from "./studio-test-utils";
import { StudioPage } from "@/features/studio/components/studio-page";

// Grounded in src/features/studio/hooks/use-studio.ts (generateQuestions,
// togglePublish, saveDraftAction) and studio-action-bar.tsx + chat-panel.tsx's
// QuestionCard. Maps to Excel sheets RAG005/RAG006/RAG007/RAG012/RAG013
// (Studio variants). Unit-test rewrite of studio-flow.spec.ts.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/studio/services/studio.service", () => studioServiceMockFactory());

// vi.mock() doesn't change the STATIC type of this import — TS still sees
// the real module's function signatures (no .mockResolvedValue etc.). Cast
// once here instead of wrapping every call site in vi.mocked(...).
import * as studioApiTyped from "@/features/studio/services/studio.service";
const studioApi = studioApiTyped as unknown as ReturnType<typeof studioServiceMockFactory>;

function approvedPlan() {
  return draftPlan({ status: "Approved", totalQuestions: 15, difficultyMix: { easy: 5, medium: 7, hard: 3 } });
}

async function bootstrap(opts: Parameters<typeof bootstrapStudio>[1] = {}) {
  (await getMockedGetMySubscription()).mockResolvedValue(freeSubscriptionReady() as never);
  bootstrapStudio(studioApi as never, {
    plan: opts.plan === undefined ? approvedPlan() : opts.plan,
    hasJd: true,
    settings: opts.settings ?? readySettings({ appliedPlanId: "plan-1", readiness: { hasJobDescription: true, hasSelectedDocument: false, hasAwaitingApprovalPlan: false, hasApprovedPlan: true, canGenerateQuestions: true } }),
    ...opts,
  });
}

beforeEach(async () => {
  Object.values(studioApi).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  });
  (await getMockedGetMySubscription()).mockReset();
});

async function findActionBarButton(name: string) {
  const actionBar = await screen.findByRole("region", { name: "Action bar" }, { timeout: 10000 });
  return within(actionBar).findByRole("button", { name });
}

describe("RAG005/006/007/SUB — Studio question generation", () => {
  test("RAG005-ST: happy-path generate flow shows the RAG-started and questions-generated toasts", async () => {
    await bootstrap();
    const generatedQuestions = Array.from({ length: 5 }, (_, i) => question(`q-${i}`, i, `Explain question ${i + 1}.`));
    const run = {
      id: "run-1", planId: "plan-1", status: "Completed", requestedQuestionCount: 5, generatedQuestionCount: 5,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), errorCode: null, errorMessage: null,
    };
    studioApi.generateQuestions.mockResolvedValue(run as never);
    studioApi.getGenerationRun.mockResolvedValue(run as never);
    studioApi.listQuestions.mockResolvedValueOnce({ page: 1, pageSize: 100, total: 0, items: [] } as never);
    studioApi.listQuestions.mockResolvedValue({ page: 1, pageSize: 100, total: 5, items: generatedQuestions } as never);

    const user = userEvent.setup();
    renderStudio(<StudioPage />);
    const generateBtn = await findActionBarButton("Generate Questions");
    expect(generateBtn).toBeEnabled();
    await user.click(generateBtn);

    expect(await screen.findByText("Sent to RAG — generating questions…", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByText("5 questions generated.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByText("Explain question 1.")).toBeInTheDocument();
  });

  test("RAG006-ST: a QUESTIONS_ALREADY_EXIST conflict shows a confirm dialog, and confirming retries with replaceExisting", async () => {
    // P2b: BE rejecting with QUESTIONS_ALREADY_EXIST no longer auto-retries —
    // it surfaces a confirm dialog so the user can decide before their
    // manually-edited questions are overwritten (see use-studio.ts's
    // confirmReplaceQuestions and studio-page.tsx's replaceDialog).
    await bootstrap();
    const run = {
      id: "run-2", planId: "plan-1", status: "Completed", requestedQuestionCount: 3, generatedQuestionCount: 3,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), errorCode: null, errorMessage: null,
    };
    const calls: boolean[] = [];
    studioApi.generateQuestions.mockImplementation(async (_projectId, payload) => {
      calls.push((payload as { replaceExisting: boolean }).replaceExisting);
      if (!(payload as { replaceExisting: boolean }).replaceExisting) {
        const err = { response: { status: 409, data: { message: "QUESTIONS_ALREADY_EXIST" } } };
        throw err;
      }
      return run as never;
    });
    studioApi.getGenerationRun.mockResolvedValue(run as never);
    const generatedQuestions = Array.from({ length: 3 }, (_, i) => question(`q-${i}`, i));
    studioApi.listQuestions.mockResolvedValueOnce({ page: 1, pageSize: 100, total: 0, items: [] } as never);
    studioApi.listQuestions.mockResolvedValue({ page: 1, pageSize: 100, total: 3, items: generatedQuestions } as never);

    const user = userEvent.setup();
    renderStudio(<StudioPage />);
    const generateBtn = await findActionBarButton("Generate Questions");
    await user.click(generateBtn);

    expect(
      await screen.findByText("Replace existing questions?", {}, { timeout: 10000 })
    ).toBeInTheDocument();
    expect(calls).toEqual([false]);

    await user.click(screen.getByRole("button", { name: "Replace" }));

    expect(await screen.findByText("3 questions generated.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(calls).toEqual([false, true]);
  });

  test("RAG007-ST: a Failed generation run surfaces the RAG error code/message as a toast", async () => {
    await bootstrap();
    const run = {
      id: "run-3", planId: "plan-1", status: "Failed", requestedQuestionCount: 15, generatedQuestionCount: 0,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
      errorCode: "RAG_TIMEOUT", errorMessage: "RAG service did not respond in time.",
    };
    studioApi.generateQuestions.mockResolvedValue(run as never);

    const user = userEvent.setup();
    renderStudio(<StudioPage />);
    const generateBtn = await findActionBarButton("Generate Questions");
    await user.click(generateBtn);

    expect(
      await screen.findByText("[RAG_TIMEOUT] RAG service did not respond in time.", {}, { timeout: 10000 })
    ).toBeInTheDocument();
    expect(await findActionBarButton("Generate Questions")).toBeEnabled();
  });

  test("RGA-SUB-1: a QUOTA_EXCEEDED errorCode on the generate call opens the quota-exceeded blocking dialog (not a toast)", async () => {
    // use-studio.ts's generateQuestions() catch block deliberately skips the
    // generic error toast for COOLDOWN_ACTIVE/QUOTA_EXCEEDED — it sets
    // quotaExceeded instead, which studio-page.tsx turns into the same
    // full-page alertdialog RAG010 covers. This test used to assert the old
    // toast-based behavior; that path no longer runs for this error code.
    await bootstrap();
    studioApi.generateQuestions.mockRejectedValue({
      response: { status: 403, data: { errorCode: "QUOTA_EXCEEDED", detail: "raw backend detail that should be ignored" } },
    });

    const user = userEvent.setup();
    renderStudio(<StudioPage />);
    const generateBtn = await findActionBarButton("Generate Questions");
    await user.click(generateBtn);

    const dialog = await screen.findByRole("alertdialog", {}, { timeout: 10000 });
    expect(dialog).toHaveTextContent("Daily generation limit reached");
  });

  test("RGA-SUB-2: an unrecognized errorCode falls back to the raw backend detail message", async () => {
    await bootstrap();
    studioApi.generateQuestions.mockRejectedValue({
      response: { status: 400, data: { errorCode: "SOME_UNMAPPED_CODE", detail: "Plan revision is out of date, refresh and try again." } },
    });

    const user = userEvent.setup();
    renderStudio(<StudioPage />);
    const generateBtn = await findActionBarButton("Generate Questions");
    await user.click(generateBtn);

    expect(
      await screen.findByText("Plan revision is out of date, refresh and try again.", {}, { timeout: 10000 })
    ).toBeInTheDocument();
  });
});

describe("RAG012 — Question edit/delete/regenerate", () => {
  test("RAG012-ST-1: editing a generated question's content persists via PUT and re-renders", async () => {
    const initialQuestions = [question("q-1", 0, "Original question text.")];
    const completedRun = {
      id: "run-4", planId: "plan-1", status: "Completed", requestedQuestionCount: 1, generatedQuestionCount: 1,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), errorCode: null, errorMessage: null,
    };
    await bootstrap({ generationRuns: [completedRun], questions: initialQuestions });
    studioApi.updateQuestion.mockResolvedValue({ ...initialQuestions[0], content: "Updated question text." } as never);

    const user = userEvent.setup();
    renderStudio(<StudioPage />);
    expect(await screen.findByText("Original question text.", {}, { timeout: 10000 })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const textarea = screen.getByPlaceholderText("Question content");
    await user.clear(textarea);
    await user.type(textarea, "Updated question text.");
    await user.click(document.querySelector("div.flex.justify-end.gap-2")!.querySelector("button:last-child")!);

    expect(await screen.findByText("Updated question text.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(studioApi.updateQuestion).toHaveBeenCalledWith(
      PROJECT_ID, "q-1", expect.objectContaining({ content: "Updated question text." })
    );
  });

  test("RAG012-ST-2: deleting a question asks for confirmation, calls DELETE, and removes it from the list", async () => {
    const initialQuestions = [question("q-1", 0, "Question to delete.")];
    const completedRun = {
      id: "run-5", planId: "plan-1", status: "Completed", requestedQuestionCount: 1, generatedQuestionCount: 1,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), errorCode: null, errorMessage: null,
    };
    await bootstrap({ generationRuns: [completedRun], questions: initialQuestions });
    studioApi.deleteQuestion.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const user = userEvent.setup();
    renderStudio(<StudioPage />);
    expect(await screen.findByText("Question to delete.", {}, { timeout: 10000 })).toBeInTheDocument();

    await user.click(screen.getByTitle("Delete"));
    await vi.waitFor(() => expect(screen.queryByText("Question to delete.")).not.toBeInTheDocument(), { timeout: 10000 });
    expect(studioApi.deleteQuestion).toHaveBeenCalledWith(PROJECT_ID, "q-1");
  });

  test("RAG012-ST-3: regenerating a question calls the regenerate endpoint then re-fetches the list", async () => {
    const initialQuestions = [question("q-1", 0, "Original question.")];
    const completedRun = {
      id: "run-8", planId: "plan-1", status: "Completed", requestedQuestionCount: 1, generatedQuestionCount: 1,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), errorCode: null, errorMessage: null,
    };
    await bootstrap({ generationRuns: [completedRun], questions: initialQuestions });
    studioApi.regenerateQuestion.mockResolvedValue(undefined);
    const regeneratedQuestions = [question("q-1", 0, "Freshly regenerated question.")];
    studioApi.listQuestions.mockResolvedValueOnce({ page: 1, pageSize: 100, total: 1, items: initialQuestions } as never);
    studioApi.listQuestions.mockResolvedValue({ page: 1, pageSize: 100, total: 1, items: regeneratedQuestions } as never);

    const user = userEvent.setup();
    renderStudio(<StudioPage />);
    expect(await screen.findByText("Original question.", {}, { timeout: 10000 })).toBeInTheDocument();

    await user.click(screen.getByTitle("Regenerate"));
    expect(await screen.findByText("Freshly regenerated question.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(studioApi.regenerateQuestion).toHaveBeenCalledWith(
      PROJECT_ID, "q-1", expect.objectContaining({ includeSampleAnswers: true })
    );
  });
});

describe("RAG013 — Save / Publish / Share", () => {
  test("RAG013-ST-3: Share creates a link, copies it to clipboard, and shows a confirmation toast", async () => {
    await bootstrap();
    studioApi.createShareLink.mockResolvedValue({ id: "share-1", token: "tok-abc123", permission: "View" } as never);
    // userEvent.setup() lazily attaches @testing-library/user-event's own
    // clipboard stub (a getter on navigator.clipboard) the first time it
    // runs against this document — which replaces whatever object a spy
    // was attached to. Call setup() BEFORE spying, or the spy ends up
    // watching an object user-event immediately discards.
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    renderStudio(<StudioPage />);
    await findActionBarButton("Generate Questions");
    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(
      await screen.findByText("Share link created and copied to clipboard.", {}, { timeout: 10000 })
    ).toBeInTheDocument();
    expect(studioApi.createShareLink).toHaveBeenCalledWith(PROJECT_ID, "View");
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("tok-abc123"));
  });

  test("RAG013-ST-1: Save draft persists and shows a confirmation toast", async () => {
    await bootstrap();
    studioApi.saveDraft.mockResolvedValue({ questionSetId: "qs-1" } as never);
    studioApi.getProject.mockResolvedValue({
      id: PROJECT_ID, name: "Interview Plan Studio", status: "Approved", isPublished: false,
      questionSetId: "qs-1", ownerId: "test-hr-user-id", latestPlanRevision: 1,
    } as never);

    const user = userEvent.setup();
    renderStudio(<StudioPage />);
    await findActionBarButton("Generate Questions");
    await user.click(await findActionBarButton("Save"));

    expect(await screen.findByText("Question set saved.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(studioApi.saveDraft).toHaveBeenCalledWith(PROJECT_ID);
  });

  test("RAG013-ST-2: Publish then unpublish toggles state and fires the correct endpoints", async () => {
    const initialQuestions = [question("q-1", 0, "A generated question.")];
    const completedRun = {
      id: "run-6", planId: "plan-1", status: "Completed", requestedQuestionCount: 1, generatedQuestionCount: 1,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), errorCode: null, errorMessage: null,
    };
    await bootstrap({ generationRuns: [completedRun], questions: initialQuestions });
    let isPublished = false;
    studioApi.getProject.mockImplementation(async () => ({
      id: PROJECT_ID, name: "Interview Plan Studio", status: "Approved", isPublished,
      questionSetId: "qs-1", ownerId: "test-hr-user-id", latestPlanRevision: 1,
    } as never));
    studioApi.publishProject.mockImplementation(async () => { isPublished = true; });
    studioApi.unpublishProject.mockImplementation(async () => { isPublished = false; });

    const user = userEvent.setup();
    renderStudio(<StudioPage />);
    const publishBtn = await screen.findByRole("button", { name: "Publish" }, { timeout: 10000 });
    await user.click(publishBtn);

    expect(await screen.findByText("Question set published.", {}, { timeout: 10000 })).toBeInTheDocument();
    const publishedBtn = await screen.findByRole("button", { name: "Published" });

    await user.click(publishedBtn);
    expect(await screen.findByText("Question set unpublished.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Publish" })).toBeInTheDocument();
  });
});

test("RAG029-1: \"New Set\" creates a fresh project and resets JD/plan/settings/questions to blank", async () => {
  const initialQuestions = [question("q-1", 0, "A generated question.")];
  const completedRun = {
    id: "run-7", planId: "plan-1", status: "Completed", requestedQuestionCount: 1, generatedQuestionCount: 1,
    startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), errorCode: null, errorMessage: null,
  };
  await bootstrap({ generationRuns: [completedRun], questions: initialQuestions });
  studioApi.createProject.mockResolvedValue({ id: "proj-2", name: "New" } as never);

  const user = userEvent.setup();
  renderStudio(<StudioPage />);
  expect(await screen.findByText("A generated question.", {}, { timeout: 10000 })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "New Set" }));
  expect(
    await screen.findByText("New session created. Enter a JD, select documents, then create a plan.", {}, { timeout: 10000 })
  ).toBeInTheDocument();

  expect(studioApi.createProject).toHaveBeenCalled();
  expect(screen.queryByText("A generated question.")).not.toBeInTheDocument();
  expect(await findActionBarButton("Create Plan")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Paste your job description here…")).toHaveValue("");
});

test('RAG029-2: a settings update still in flight for the OLD session does not corrupt a new session started via "New Set"', async () => {
  // Regression test for a real bug found in code review: updateSettingField's
  // optimistic write used to be keyed only by settingsVersionRef, which was
  // never bumped on a project switch — so a settings PUT request started just
  // before "New Set" is clicked could resolve AFTER the switch and silently
  // overwrite the brand-new session's settings with the old project's stale
  // values. createNewSession now resets both settingsRef and
  // settingsVersionRef synchronously, which this test verifies by holding
  // the old project's updateSettings response open until after the switch.
  await bootstrap();
  studioApi.createProject.mockResolvedValue({ id: "proj-2", name: "New" } as never);

  // Deferred — resolves only when we explicitly call resolveUpdate() below,
  // simulating a slow network response landing after the user has already
  // moved on to a new session.
  let resolveUpdate!: (value: unknown) => void;
  studioApi.updateSettings.mockImplementation(
    () => new Promise((resolve) => { resolveUpdate = resolve; })
  );

  const user = userEvent.setup();
  renderStudio(<StudioPage />);
  await findActionBarButton("Generate Questions");
  const toggle = screen.getAllByRole("switch")[0];
  expect(toggle).toHaveAttribute("aria-checked", "true");

  // Start a settings change for the CURRENT (soon-to-be-old) project —
  // deliberately left unresolved.
  await user.click(toggle);
  expect(studioApi.updateSettings).toHaveBeenCalledWith(
    PROJECT_ID, expect.objectContaining({ includeSampleAnswers: false })
  );

  // Switch to a brand-new session while that request is still in flight.
  await user.click(screen.getByRole("button", { name: "New Set" }));
  await screen.findByText(
    "New session created. Enter a JD, select documents, then create a plan.",
    {}, { timeout: 10000 }
  );

  // Sanity check: the reset from "New Set" already shows the new session's
  // default (true) at this point regardless of the fix — the real assertion
  // is that this stays true AFTER the stale response below is given a chance
  // to (incorrectly, pre-fix) overwrite it.
  expect(screen.getAllByRole("switch")[0]).toHaveAttribute("aria-checked", "true");

  // NOW the stale response for the OLD project finally lands. Flush the
  // microtask queue for real (a plain assertion right after, unlike waitFor,
  // won't retry and mask a later corruption — it must observe the settled
  // state directly).
  resolveUpdate(readySettings({ appliedPlanId: "plan-1", includeSampleAnswers: false }) as never);
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));

  expect(screen.getAllByRole("switch")[0]).toHaveAttribute("aria-checked", "true");
});

test('RAG030-1: toggling "Include sample answers" off persists via PUT settings', async () => {
  await bootstrap();
  studioApi.updateSettings.mockImplementation(async (_projectId, payload) =>
    readySettings({ ...(payload as object), appliedPlanId: "plan-1" }) as never
  );

  const user = userEvent.setup();
  renderStudio(<StudioPage />);
  await findActionBarButton("Generate Questions");
  const toggle = screen.getAllByRole("switch")[0];
  expect(toggle).toHaveAttribute("aria-checked", "true");

  await user.click(toggle);
  await vi.waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"), { timeout: 5000 });
  expect(studioApi.updateSettings).toHaveBeenCalledWith(
    PROJECT_ID, expect.objectContaining({ includeSampleAnswers: false })
  );
});

test('RAG008-1: a generation run stuck "Generating" for the full 5-minute deadline shows the timeout recovery message', { timeout: 30000 }, async () => {
  // use-studio.ts's generateQuestions() polls getGenerationRun() every 2.5s
  // against a `const deadline = Date.now() + 5*60_000` computed once right
  // after the run starts, then loops `while (Date.now() < deadline) { sleep
  // 2500; poll; }`. Rather than faking ~120 individual 2.5s ticks, spy on
  // Date.now() so it starts returning a time far past the deadline as soon
  // as the FIRST poll lands — the loop's very next condition check then
  // exits immediately, same as the Playwright version's single real poll +
  // page.clock.fastForward() jump. The one 2.5s sleep before that still
  // elapses for real (acceptable — test timeout is 30s).
  await bootstrap();
  const stuckRun = {
    id: "run-stuck-1234", planId: "plan-1", status: "Generating",
    requestedQuestionCount: 15, generatedQuestionCount: 0,
    startedAt: new Date().toISOString(), completedAt: null, errorCode: null, errorMessage: null,
  };
  studioApi.generateQuestions.mockResolvedValue(stuckRun as never);
  let polled = false;
  studioApi.getGenerationRun.mockImplementation(async () => {
    polled = true; // from here on, Date.now() (spied below) reads "way past deadline"
    return stuckRun as never;
  });
  const realNow = Date.now.bind(Date);
  vi.spyOn(Date, "now").mockImplementation(() => (polled ? realNow() + 10 * 60_000 : realNow()));

  const user = userEvent.setup();
  renderStudio(<StudioPage />);
  const generateBtn = await findActionBarButton("Generate Questions");
  await user.click(generateBtn);
  expect(await screen.findByText("Sent to RAG — generating questions…")).toBeInTheDocument();

  expect(await screen.findByText(/Job vẫn Generating sau 5 phút/, {}, { timeout: 20000 })).toBeInTheDocument();
  expect(screen.getByText(/bấm Làm mới trạng thái/)).toBeInTheDocument();
});
