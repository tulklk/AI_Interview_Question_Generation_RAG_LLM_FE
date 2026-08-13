import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { recommendationServiceMockFactory, recommendation } from "./recommendations-mocks";
import { renderWithProviders } from "./test-utils";
import { RecommendationsList } from "@/features/hr/components/recommendations/recommendations-list";

// Grounded in src/features/hr/components/recommendations/recommendations-list.tsx
// — where HR reviews AI-matched candidates and shortlists/dismisses/invites
// them. No prior automated coverage existed. Renders <RecommendationsList>
// directly, mocking recommendation.service at the module boundary.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/hr/services/recommendation.service", async () => {
  const mod = await import("./recommendations-mocks");
  return mod.recommendationServiceMockFactory();
});

import * as recommendationApiTyped from "@/features/hr/services/recommendation.service";
const recommendationApi = recommendationApiTyped as unknown as ReturnType<typeof recommendationServiceMockFactory>;

beforeEach(() => {
  Object.values(recommendationApi).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  });
});

describe("HR Recommendations — listing and filtering", () => {
  test("REC-1: lists candidates with name, role, and score", async () => {
    recommendationApi.listRecommendations.mockResolvedValue({
      items: [recommendation({ id: "rec-1", candidateName: "Nguyen Van A", score: 88 })],
      totalCount: 1,
    } as never);
    renderWithProviders(<RecommendationsList />);

    expect(await screen.findByText("Nguyen Van A", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText("88")).toBeInTheDocument();
  });

  test("REC-2: switching to the Shortlisted status tab re-fetches with that status filter", async () => {
    recommendationApi.listRecommendations.mockResolvedValue({
      items: [recommendation({ candidateName: "Nguyen Van A" })],
      totalCount: 1,
    } as never);
    const user = userEvent.setup();
    renderWithProviders(<RecommendationsList />);
    await screen.findByText("Nguyen Van A", {}, { timeout: 10000 });

    await user.click(screen.getByRole("button", { name: "Shortlisted" }));

    await waitFor(() =>
      expect(recommendationApi.listRecommendations).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "SHORTLISTED" })
      )
    );
  });

  test("REC-3: search filters client-side by question set title", async () => {
    recommendationApi.listRecommendations.mockResolvedValue({
      items: [
        recommendation({ id: "rec-1", candidateName: "Nguyen Van A", questionSetTitle: "Backend Developer Interview" }),
        recommendation({ id: "rec-2", candidateName: "Tran Thi B", questionSetTitle: "Frontend React Deep Dive" }),
      ],
      totalCount: 2,
    } as never);
    const user = userEvent.setup();
    renderWithProviders(<RecommendationsList />);
    await screen.findByText("Nguyen Van A", {}, { timeout: 10000 });

    await user.type(screen.getByPlaceholderText("Search by question set…"), "react");

    expect(screen.queryByText("Nguyen Van A")).not.toBeInTheDocument();
    expect(screen.getByText("Tran Thi B")).toBeInTheDocument();
  });

  test("REC-4: no matches shows the empty state", async () => {
    recommendationApi.listRecommendations.mockResolvedValue({ items: [], totalCount: 0 } as never);
    renderWithProviders(<RecommendationsList />);

    expect(
      await screen.findByText("No candidates found matching your filters.", {}, { timeout: 10000 })
    ).toBeInTheDocument();
  });

  test("REC-5: a load failure shows Retry, and Retry re-fetches", async () => {
    recommendationApi.listRecommendations.mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    renderWithProviders(<RecommendationsList />);

    const retryBtn = await screen.findByRole("button", { name: "Retry" }, { timeout: 10000 });
    recommendationApi.listRecommendations.mockResolvedValue({
      items: [recommendation({ candidateName: "Nguyen Van A" })],
      totalCount: 1,
    } as never);
    await user.click(retryBtn);

    expect(await screen.findByText("Nguyen Van A", {}, { timeout: 10000 })).toBeInTheDocument();
  });
});

describe("HR Recommendations — shortlist / dismiss actions", () => {
  test("REC-6: shortlisting a NEW candidate calls shortlistRecommendation and updates their badge", async () => {
    recommendationApi.listRecommendations.mockResolvedValue({
      items: [recommendation({ id: "rec-1", candidateName: "Nguyen Van A", status: "NEW" })],
      totalCount: 1,
    } as never);
    recommendationApi.shortlistRecommendation.mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderWithProviders(<RecommendationsList />);
    await screen.findByText("Nguyen Van A", {}, { timeout: 10000 });

    await user.click(screen.getByTitle("Shortlist"));

    await waitFor(() => expect(recommendationApi.shortlistRecommendation).toHaveBeenCalledWith("rec-1"));
    expect(await screen.findByText("Added to shortlist.")).toBeInTheDocument();
  });

  test('REC-7 (finding): dismissing an already-acted candidate (409) shows "already invited or dismissed" instead of the generic dismiss-failed message', async () => {
    recommendationApi.listRecommendations.mockResolvedValue({
      items: [recommendation({ id: "rec-1", candidateName: "Nguyen Van A", status: "NEW" })],
      totalCount: 1,
    } as never);
    recommendationApi.dismissRecommendation.mockRejectedValue({ response: { status: 409 } });
    const user = userEvent.setup();
    renderWithProviders(<RecommendationsList />);
    await screen.findByText("Nguyen Van A", {}, { timeout: 10000 });

    await user.click(screen.getByTitle("Dismiss"));

    expect(
      await screen.findByText("This candidate has already been invited or dismissed.")
    ).toBeInTheDocument();
  });

  test("REC-8: a DISMISSED candidate can still be shortlisted again (not a terminal state)", async () => {
    recommendationApi.listRecommendations.mockResolvedValue({
      items: [recommendation({ id: "rec-1", candidateName: "Nguyen Van A", status: "DISMISSED" })],
      totalCount: 1,
    } as never);
    recommendationApi.shortlistRecommendation.mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderWithProviders(<RecommendationsList />);
    await screen.findByText("Nguyen Van A", {}, { timeout: 10000 });

    const shortlistBtn = screen.getByTitle("Shortlist");
    expect(shortlistBtn).toBeInTheDocument();
    await user.click(shortlistBtn);

    await waitFor(() => expect(recommendationApi.shortlistRecommendation).toHaveBeenCalledWith("rec-1"));
  });

  test("REC-9: an INVITED candidate has no shortlist/dismiss actions available (terminal state)", async () => {
    recommendationApi.listRecommendations.mockResolvedValue({
      items: [recommendation({ id: "rec-1", candidateName: "Nguyen Van A", status: "INVITED" })],
      totalCount: 1,
    } as never);
    renderWithProviders(<RecommendationsList />);
    await screen.findByText("Nguyen Van A", {}, { timeout: 10000 });

    expect(screen.queryByTitle("Shortlist")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Dismiss")).not.toBeInTheDocument();
  });
});
