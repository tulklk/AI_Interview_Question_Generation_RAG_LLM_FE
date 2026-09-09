import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { QuestionBuilderPage } from "@/features/interview/components/generate/question-builder-page";

// Grounded in src/features/interview/components/generate/question-builder-page.tsx
// (SCRUM-397 v3 "Question Builder"). Maps to Excel sheets MQ001-MQ011
// (ManualQuestionModule). Unit-test rewrite of question-builder.spec.ts.

const DRAFT_SET = { questionSetId: "qs-1", title: "Backend Mid-level", status: "DRAFT" as const, questionCount: 2, isBookmarked: false, savedAt: new Date().toISOString() };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/hr/services/hr-history.service", () => ({
  listHistoryQuestionSets: vi.fn(),
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

import * as hrHistoryApi from "@/features/hr/services/hr-history.service";
import * as interviewApi from "@/features/interview/services/interview.service";

function mockQuestionSets(drafts: unknown[] = [DRAFT_SET]) {
  vi.mocked(hrHistoryApi.listHistoryQuestionSets).mockResolvedValue(drafts as never);
}

beforeEach(() => {
  vi.mocked(hrHistoryApi.listHistoryQuestionSets).mockReset();
  vi.mocked(interviewApi.addQuestionSetQuestion).mockReset();
  vi.mocked(interviewApi.createManualDraftQuestionSet).mockReset();
  vi.mocked(interviewApi.uploadQuestionSetQuestionImage).mockReset();
});

describe("MQ — Question Builder", () => {
  test("MQ001: with an existing DRAFT set, the composer is enabled and shows the set in the left panel", async () => {
    mockQuestionSets();
    renderWithProviders(<QuestionBuilderPage />);

    expect(await screen.findByRole("heading", { name: "Create questions manually" }, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Backend Mid-level/ })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter question content...")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save & add next" })).toBeInTheDocument();
  });

  test("MQ002: with no DRAFT sets, the create-set form opens automatically and the composer shows its no-set empty state", async () => {
    // question-builder-composer.tsx no longer renders a disabled textarea
    // when no set is selected — its `disabled` prop now short-circuits to a
    // whole empty-state card instead ("Chưa chọn bộ → hiện empty state thay
    // vì hàng loạt input bị mờ").
    mockQuestionSets([]);
    renderWithProviders(<QuestionBuilderPage />);

    expect(await screen.findByText("No DRAFT sets yet. Create one above to start.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Set name (e.g. Backend Mid-level)")).toBeInTheDocument();
    expect(screen.getByText("No question set selected")).toBeInTheDocument();
    expect(screen.getByText("Pick a DRAFT set on the left, or create a new one to start composing.")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Enter question content...")).not.toBeInTheDocument();
  });

  test("MQ003: creating a new set posts the trimmed title/description and selects it", async () => {
    mockQuestionSets([]);
    const user = userEvent.setup();
    vi.mocked(interviewApi.createManualDraftQuestionSet).mockResolvedValue({
      questionSetId: "qs-new", title: "Frontend Senior", status: "DRAFT", questionCount: 0,
    });
    renderWithProviders(<QuestionBuilderPage />);

    expect(await screen.findByPlaceholderText("Set name (e.g. Backend Mid-level)", {}, { timeout: 10000 })).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Set name (e.g. Backend Mid-level)"), "  Frontend Senior  ");
    await user.type(screen.getByPlaceholderText("Short description (optional)"), "  React focus  ");

    mockQuestionSets([{ ...DRAFT_SET, questionSetId: "qs-new", title: "Frontend Senior", questionCount: 0 }]);
    await user.click(screen.getByRole("button", { name: "Create DRAFT set" }));

    expect(await screen.findByText("New DRAFT set created.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(interviewApi.createManualDraftQuestionSet).toHaveBeenCalledWith({ title: "Frontend Senior", description: "React focus" });
  });

  test("MQ004: creating a set with a blank title is rejected client-side with no request sent", async () => {
    mockQuestionSets([]);
    const user = userEvent.setup();
    renderWithProviders(<QuestionBuilderPage />);

    expect(await screen.findByPlaceholderText("Set name (e.g. Backend Mid-level)", {}, { timeout: 10000 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create DRAFT set" }));

    expect(await screen.findByText("Please enter a set name.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(interviewApi.createManualDraftQuestionSet).not.toHaveBeenCalled();
  });

  test("MQ005: the Save button stays disabled for an empty question, so no request is ever sent", async () => {
    // question-builder-composer.tsx now proactively disables "Save & add
    // next" via `disabled={saving || !hasQuestion}` — onSave's own
    // toastQuestionRequired guard (question-builder-page.tsx) is unreachable
    // through a real click since userEvent no-ops on a disabled button.
    mockQuestionSets();
    const user = userEvent.setup();
    renderWithProviders(<QuestionBuilderPage />);

    const saveBtn = await screen.findByRole("button", { name: "Save & add next" }, { timeout: 10000 });
    expect(saveBtn).toBeDisabled();
    await user.click(saveBtn);

    expect(screen.queryByText("Please enter the question content.")).not.toBeInTheDocument();
    expect(interviewApi.addQuestionSetQuestion).not.toHaveBeenCalled();
  });

  test("MQ006: filling the composer and saving posts every field and adds the question to the session list", async () => {
    mockQuestionSets();
    const user = userEvent.setup();
    let saveBody: Record<string, unknown> | null = null;
    vi.mocked(interviewApi.addQuestionSetQuestion).mockImplementation(async (_id, payload) => {
      saveBody = payload as unknown as Record<string, unknown>;
      return {
        id: "q-new", question: payload.question, questionType: payload.questionType as never,
        difficulty: payload.difficulty as never,
      } as never;
    });
    renderWithProviders(<QuestionBuilderPage />);

    await user.type(await screen.findByPlaceholderText("Enter question content...", {}, { timeout: 10000 }), "Explain closures in JavaScript.");
    await user.click(screen.getByRole("button", { name: "Hard" }));
    await user.click(screen.getByRole("button", { name: "Behavioral" }));
    await user.type(screen.getByPlaceholderText("e.g. React, SQL, Redis"), "JavaScript");
    await user.type(screen.getByPlaceholderText("e.g. Frontend, Database"), "Frontend");
    await user.type(screen.getByPlaceholderText(/Sample answer for HR/), "A closure is a function bundled with its lexical scope.");
    // Rubric editing is now the shared RubricEditor (criteria + weight +
    // anchors, shared/rubric/components/rubric-editor.tsx) rather than a
    // raw "one criterion per line" textarea — left untouched here, since
    // question-builder-page.tsx's onSave auto-fills a preset rubric
    // (buildPresetCriteria) whenever rubricDoc.criteria is still empty at
    // save time.

    await user.click(screen.getByRole("button", { name: "Save & add next" }));

    expect(await screen.findByText("Question saved (all Marketplace fields) to the selected set.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(saveBody).toMatchObject({
      question: "Explain closures in JavaScript.",
      questionType: "Behavioral",
      difficulty: "Hard",
      skill: "JavaScript",
      focusArea: "Frontend",
      sampleAnswer: "A closure is a function bundled with its lexical scope.",
      answerMethod: "Code",
    });
    // The auto-filled preset rubric — assert its shape (a valid, weight-summing
    // criteria list) rather than its exact (Vietnamese, preset-defined) label text.
    const criteria = (saveBody as unknown as { evaluationCriteria: { label: string; weight: number }[] }).evaluationCriteria;
    expect(criteria.length).toBeGreaterThan(0);
    expect(criteria.reduce((sum, c) => sum + c.weight, 0)).toBe(100);

    expect(screen.getByPlaceholderText("Enter question content...")).toHaveValue("");
    expect(screen.getByText("Added this session", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Explain closures in JavaScript.")).toBeInTheDocument();
  }, 15000);

  test('MQ007: Code content mode saves with answerMethod "Code" and shows the template picker', async () => {
    mockQuestionSets();
    const user = userEvent.setup();
    let saveBody: Record<string, unknown> | null = null;
    vi.mocked(interviewApi.addQuestionSetQuestion).mockImplementation(async (_id, payload) => {
      saveBody = payload as unknown as Record<string, unknown>;
      return { id: "q-new", question: payload.question } as never;
    });
    renderWithProviders(<QuestionBuilderPage />);

    await screen.findByRole("button", { name: "Save & add next" }, { timeout: 10000 });
    expect(screen.getByText("Find and explain bugs in code")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Enter question content..."), "Find the bug in this loop.");
    await user.click(screen.getByRole("button", { name: "Save & add next" }));

    expect(await screen.findByText("Question saved (all Marketplace fields) to the selected set.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(saveBody).toMatchObject({ answerMethod: "Code" });
  });

  test('MQ008: switching to Theory mode hides code fields and saves with answerMethod "Text"', async () => {
    mockQuestionSets();
    const user = userEvent.setup();
    let saveBody: Record<string, unknown> | null = null;
    vi.mocked(interviewApi.addQuestionSetQuestion).mockImplementation(async (_id, payload) => {
      saveBody = payload as unknown as Record<string, unknown>;
      return { id: "q-new", question: payload.question } as never;
    });
    renderWithProviders(<QuestionBuilderPage />);

    await screen.findByRole("button", { name: "Save & add next" }, { timeout: 10000 });
    await user.click(screen.getByRole("button", { name: "Theory" }));
    expect(screen.queryByText("Code template")).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Enter question content..."), "What is the CAP theorem?");
    await user.click(screen.getByRole("button", { name: "Save & add next" }));

    expect(await screen.findByText("Question saved (all Marketplace fields) to the selected set.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(saveBody).toMatchObject({ answerMethod: "Text" });
  });

  test("MQ009: System design mode shows the diagram-hint field and banner instead of code fields", async () => {
    mockQuestionSets();
    const user = userEvent.setup();
    renderWithProviders(<QuestionBuilderPage />);

    await screen.findByRole("button", { name: "Save & add next" }, { timeout: 10000 });
    await user.click(screen.getByRole("button", { name: "System design" }));

    expect(await screen.findByText(/System design template/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/architecture overview, sequence diagram/)).toBeInTheDocument();
    expect(screen.queryByText("Code template")).not.toBeInTheDocument();
  });

  test("MQ010: a failed save (backend returns nothing usable) shows an error toast and keeps the composer filled", async () => {
    mockQuestionSets();
    const user = userEvent.setup();
    // No usable "question" field in the response -> normalizeDraftQuestion() -> null
    // -> addQuestionSetQuestion() -> null -> onSave() surfaces toastSaveFailed.
    vi.mocked(interviewApi.addQuestionSetQuestion).mockResolvedValue(null);
    renderWithProviders(<QuestionBuilderPage />);

    await user.type(await screen.findByPlaceholderText("Enter question content...", {}, { timeout: 10000 }), "This save will fail.");
    await user.click(screen.getByRole("button", { name: "Save & add next" }));

    expect(await screen.findByText("Save failed. Check that the set is still in DRAFT status.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter question content...")).toHaveValue("This save will fail.");
  });

  test('MQ011: selecting a different set clears the "added this session" list', async () => {
    const otherSet = { questionSetId: "qs-2", title: "DevOps Basics", status: "DRAFT" as const, questionCount: 0, isBookmarked: false, savedAt: new Date().toISOString() };
    mockQuestionSets([DRAFT_SET, otherSet]);
    const user = userEvent.setup();
    vi.mocked(interviewApi.addQuestionSetQuestion).mockResolvedValue({ id: "q-new", question: "A saved question." } as never);
    renderWithProviders(<QuestionBuilderPage />);

    await user.type(await screen.findByPlaceholderText("Enter question content...", {}, { timeout: 10000 }), "A saved question.");
    await user.click(screen.getByRole("button", { name: "Save & add next" }));
    expect(await screen.findByText("Added this session", { exact: true }, { timeout: 10000 })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /DevOps Basics/ }));
    expect(screen.queryByText("Added this session", { exact: true })).not.toBeInTheDocument();
  });
});
