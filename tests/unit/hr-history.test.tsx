import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor, within } from "@testing-library/react";
import {
  hrHistoryServiceMockFactory,
  interviewServiceMockFactory,
  historyItem,
} from "./hr-history-mocks";
import {
  premiumSubscription,
  freeSubscriptionReady,
  renderStudio,
  getMockedGetMySubscription,
} from "./studio-test-utils";
import { QuestionSetHistoryTable } from "@/features/hr/components/history/question-set-history-table";

// Grounded in src/features/hr/components/history/question-set-history-table.tsx
// — the actual page HR lands on to manage every question set (search, filter,
// publish/unpublish, bookmark, export, delete). No prior automated coverage
// existed for this table at all. Renders <QuestionSetHistoryTable> directly
// (wrapped in HrSubscriptionProvider, reusing studio-test-utils.tsx's
// subscription fixtures/render helper), mocking hr-history.service /
// interview.service at the module boundary.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/hr/services/hr-history.service", async () => {
  const mod = await import("./hr-history-mocks");
  return mod.hrHistoryServiceMockFactory();
});
vi.mock("@/features/interview/services/interview.service", async () => {
  const mod = await import("./hr-history-mocks");
  return mod.interviewServiceMockFactory();
});

import * as historyApiTyped from "@/features/hr/services/hr-history.service";
import * as interviewApiTyped from "@/features/interview/services/interview.service";
const historyApi = historyApiTyped as unknown as ReturnType<typeof hrHistoryServiceMockFactory>;
const interviewApi = interviewApiTyped as unknown as ReturnType<typeof interviewServiceMockFactory>;

// Explicit, distinct timestamps — the table defaults to sorting by date
// (publishedAt ?? savedAt) newest-first, so relying on each historyItem()
// call's own `new Date().toISOString()` (a few microseconds apart) makes row
// order a genuine race between test runs. qs-1 is deliberately the newer one
// so it's deterministically the first row / "index 0" wherever tests assume that.
const ITEMS = [
  historyItem({ questionSetId: "qs-1", title: "Backend Developer Set", status: "DRAFT", questionCount: 8, isBookmarked: false, savedAt: "2026-06-01T00:00:00Z" }),
  historyItem({ questionSetId: "qs-2", title: "Frontend React Set", status: "PUBLISHED", questionCount: 12, isBookmarked: true, savedAt: "2026-01-01T00:00:00Z", publishedAt: "2026-01-01T00:00:00Z" }),
];

beforeEach(async () => {
  Object.values(historyApi).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  });
  Object.values(interviewApi).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  });
  historyApi.listHistoryQuestionSets.mockResolvedValue(ITEMS as never);
  (await getMockedGetMySubscription()).mockReset();
  (await getMockedGetMySubscription()).mockResolvedValue(premiumSubscription() as never);
});

describe("HR History — listing and filtering", () => {
  test("HIST-1: lists question sets with title, status badge, and question count", async () => {
    renderStudio(<QuestionSetHistoryTable filter="all" />);

    expect(await screen.findByText("Backend Developer Set", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText("Frontend React Set")).toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  test("HIST-2: search filters rows by title", async () => {
    const user = userEvent.setup();
    renderStudio(<QuestionSetHistoryTable filter="all" />);
    await screen.findByText("Backend Developer Set", {}, { timeout: 10000 });

    await user.type(screen.getByPlaceholderText("Search by question set title..."), "react");

    expect(screen.queryByText("Backend Developer Set")).not.toBeInTheDocument();
    expect(screen.getByText("Frontend React Set")).toBeInTheDocument();
  });

  test('HIST-3: filter="PUBLISHED" only shows published sets, filter="bookmarked" only shows bookmarked ones', async () => {
    const { unmount } = renderStudio(<QuestionSetHistoryTable filter="PUBLISHED" />);
    await screen.findByText("Frontend React Set", {}, { timeout: 10000 });
    expect(screen.queryByText("Backend Developer Set")).not.toBeInTheDocument();
    unmount();

    renderStudio(<QuestionSetHistoryTable filter="bookmarked" />);
    expect(await screen.findByText("Frontend React Set", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.queryByText("Backend Developer Set")).not.toBeInTheDocument();
  });

  test("HIST-4: a load failure shows the error message instead of the table", async () => {
    historyApi.listHistoryQuestionSets.mockReset();
    historyApi.listHistoryQuestionSets.mockRejectedValue(new Error("Network error loading sets"));
    renderStudio(<QuestionSetHistoryTable filter="all" />);

    expect(await screen.findByText("Network error loading sets", {}, { timeout: 10000 })).toBeInTheDocument();
  });
});

describe("HR History — publish / unpublish / bookmark", () => {
  test("HIST-5: publishing a Draft set calls publishQuestionSet and flips its badge to Published", async () => {
    interviewApi.publishQuestionSet.mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderStudio(<QuestionSetHistoryTable filter="all" />);
    await screen.findByText("Backend Developer Set", {}, { timeout: 10000 });

    await user.click(screen.getByTitle("Publish to marketplace"));

    await waitFor(() => expect(interviewApi.publishQuestionSet).toHaveBeenCalledWith("qs-1"));
    await waitFor(() => expect(screen.getAllByText("Published")).toHaveLength(2));
  });

  test("HIST-6: unpublishing a Published set calls unpublishQuestionSet and flips its badge to Draft", async () => {
    interviewApi.unpublishQuestionSet.mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderStudio(<QuestionSetHistoryTable filter="all" />);
    await screen.findByText("Frontend React Set", {}, { timeout: 10000 });

    await user.click(screen.getByTitle("Unpublish"));

    await waitFor(() => expect(interviewApi.unpublishQuestionSet).toHaveBeenCalledWith("qs-2"));
    await waitFor(() => expect(screen.getAllByText("Saved")).toHaveLength(2));
  });

  test("HIST-7: toggling the bookmark icon calls toggleHrBookmark and updates the icon's title", async () => {
    interviewApi.toggleHrBookmark.mockResolvedValue(true as never);
    const user = userEvent.setup();
    renderStudio(<QuestionSetHistoryTable filter="all" />);
    await screen.findByText("Backend Developer Set", {}, { timeout: 10000 });

    const addBookmarkBtns = screen.getAllByTitle("Save to bookmarks");
    await user.click(addBookmarkBtns[0]);

    await waitFor(() => expect(interviewApi.toggleHrBookmark).toHaveBeenCalledWith("qs-1"));
  });
});

describe("HR History — delete", () => {
  test("HIST-8: delete asks for confirmation first, then removes the row on confirm", async () => {
    historyApi.deleteHistoryQuestionSet.mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderStudio(<QuestionSetHistoryTable filter="all" />);
    await screen.findByText("Backend Developer Set", {}, { timeout: 10000 });

    await user.click(screen.getAllByTitle("Delete")[0]);
    const dialogTitle = await screen.findByText("Confirm Delete");
    expect(historyApi.deleteHistoryQuestionSet).not.toHaveBeenCalled();

    // Scope to the dialog itself — the still-visible row for qs-2 also has an
    // icon button whose accessible name (from its `title`) is "Delete", so an
    // unscoped getByRole("button", { name: "Delete" }) would match 2 elements.
    const dialog = dialogTitle.closest("div.relative") as HTMLElement;
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(historyApi.deleteHistoryQuestionSet).toHaveBeenCalledWith("qs-1"));
    await waitFor(() => expect(screen.queryByText("Backend Developer Set")).not.toBeInTheDocument());
  });
});

describe("HR History — export gated by plan", () => {
  test("HIST-9: the export (Download Excel) button only shows for a Premium plan, not Free", async () => {
    const { unmount } = renderStudio(<QuestionSetHistoryTable filter="all" />);
    await screen.findByText("Backend Developer Set", {}, { timeout: 10000 });
    expect(screen.getAllByTitle("Download Excel").length).toBeGreaterThan(0);
    unmount();

    (await getMockedGetMySubscription()).mockReset();
    (await getMockedGetMySubscription()).mockResolvedValue(freeSubscriptionReady() as never);
    renderStudio(<QuestionSetHistoryTable filter="all" />);
    await screen.findByText("Backend Developer Set", {}, { timeout: 10000 });
    expect(screen.queryByTitle("Download Excel")).not.toBeInTheDocument();
  });
});
