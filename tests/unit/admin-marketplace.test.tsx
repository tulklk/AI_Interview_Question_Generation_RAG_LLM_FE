import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import AdminMarketplacePage from "@/app/admin/marketplace/page";
import type { AdminMarketplaceListItem, AdminMarketplaceStats, AdminMarketplaceDetail } from "@/features/admin/services/admin-marketplace.service";

// Grounded in src/app/admin/marketplace/page.tsx and
// src/features/admin/components/marketplace/* — Admin's Marketplace
// Management page (browse published sets, search/sort, pin/unpin, detail
// panel). No prior automated coverage existed. AdminRouteGuard/AdminAppShell
// stubbed to pass-through. Mocks admin-marketplace.service at the module
// boundary; MarketplaceStats/AdminMarketplaceCardGrid/MarketplaceDetailPanel
// render for real (they're the page's own core content, not a separate
// heavy chart library).
//
// NOTE: search is debounced 300ms client-side — tests that type into the
// search box use findBy*'s own polling (which naturally waits past 300ms)
// rather than asserting synchronously right after typing.

vi.mock("@/features/admin/components/guards/admin-route-guard", () => ({
  AdminRouteGuard: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/admin/components/layout/admin-app-shell", () => ({
  AdminAppShell: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/admin/services/admin-marketplace.service", () => ({
  listMarketplaceQuestionSets: vi.fn(),
  getMarketplaceStats: vi.fn(),
  getMarketplaceQuestionSetById: vi.fn(),
  pinMarketplaceQuestionSet: vi.fn(),
  unpinMarketplaceQuestionSet: vi.fn(),
}));

import * as marketplaceApiTyped from "@/features/admin/services/admin-marketplace.service";
const marketplaceApi = marketplaceApiTyped as unknown as {
  listMarketplaceQuestionSets: ReturnType<typeof vi.fn>;
  getMarketplaceStats: ReturnType<typeof vi.fn>;
  getMarketplaceQuestionSetById: ReturnType<typeof vi.fn>;
  pinMarketplaceQuestionSet: ReturnType<typeof vi.fn>;
  unpinMarketplaceQuestionSet: ReturnType<typeof vi.fn>;
};

function item(overrides: Partial<AdminMarketplaceListItem> = {}): AdminMarketplaceListItem {
  return {
    id: "set-1",
    title: "Backend Developer Interview",
    hrUserId: "hr-1",
    hrName: "Nguyen Van A",
    hrEmail: "a@example.com",
    companyId: "co-1",
    companyName: "Acme Corp",
    difficulty: "Medium",
    skills: ["Node.js", "SQL"],
    totalQuestions: 15,
    estimatedTimeMinutes: 20,
    attemptCount: 42,
    uniqueCandidateCount: 30,
    rating: 4.5,
    isPinned: false,
    ...overrides,
  };
}

function stats(overrides: Partial<AdminMarketplaceStats> = {}): AdminMarketplaceStats {
  return { totalPublished: 10, practicesLast7Days: 25, pinnedCount: 2, topHrs: [], topSkills: [], ...overrides };
}

function detail(overrides: Partial<AdminMarketplaceDetail> = {}): AdminMarketplaceDetail {
  return { ...item(), questions: [], practitioners: [], ...overrides };
}

async function findFirstText(text: string) {
  return (await screen.findAllByText(text, {}, { timeout: 10000 }))[0];
}

beforeEach(() => {
  marketplaceApi.listMarketplaceQuestionSets.mockReset();
  marketplaceApi.getMarketplaceStats.mockReset();
  marketplaceApi.getMarketplaceQuestionSetById.mockReset();
  marketplaceApi.pinMarketplaceQuestionSet.mockReset();
  marketplaceApi.unpinMarketplaceQuestionSet.mockReset();
  marketplaceApi.getMarketplaceStats.mockResolvedValue(stats());
});

describe("Admin Marketplace — listing", () => {
  test(
    "AMKT-1: lists published sets with title, company, and HR owner",
    async () => {
      marketplaceApi.listMarketplaceQuestionSets.mockResolvedValue({ items: [item()], totalCount: 1 });
      renderWithProviders(<AdminMarketplacePage />);

      expect(await findFirstText("Backend Developer Interview")).toBeInTheDocument();
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    },
    15000
  );

  test(
    "AMKT-2: typing in search re-fetches with that keyword",
    async () => {
      marketplaceApi.listMarketplaceQuestionSets.mockResolvedValue({ items: [item()], totalCount: 1 });
      const user = userEvent.setup();
      renderWithProviders(<AdminMarketplacePage />);
      await findFirstText("Backend Developer Interview");

      await user.type(screen.getByPlaceholderText("Search by title, HR, email, company..."), "Backend");

      await vi.waitFor(
        () =>
          expect(marketplaceApi.listMarketplaceQuestionSets).toHaveBeenLastCalledWith(
            expect.objectContaining({ keyword: "Backend" })
          ),
        { timeout: 5000 }
      );
    },
    15000
  );

  test(
    "AMKT-3: no results shows the empty state",
    async () => {
      marketplaceApi.listMarketplaceQuestionSets.mockResolvedValue({ items: [], totalCount: 0 });
      renderWithProviders(<AdminMarketplacePage />);

      expect(
        await screen.findByText("No marketplace question sets found.", {}, { timeout: 10000 })
      ).toBeInTheDocument();
    },
    15000
  );

  test(
    "AMKT-4: a load failure shows the error toast",
    async () => {
      marketplaceApi.listMarketplaceQuestionSets.mockRejectedValue(new Error("network down"));
      renderWithProviders(<AdminMarketplacePage />);

      expect(await screen.findByText("Failed to load marketplace list.", {}, { timeout: 10000 })).toBeInTheDocument();
    },
    15000
  );
});

describe("Admin Marketplace — pin and detail", () => {
  test(
    "AMKT-5: pinning a set calls pinMarketplaceQuestionSet and shows a success toast",
    async () => {
      marketplaceApi.listMarketplaceQuestionSets.mockResolvedValue({ items: [item({ isPinned: false })], totalCount: 1 });
      marketplaceApi.pinMarketplaceQuestionSet.mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderWithProviders(<AdminMarketplacePage />);
      await findFirstText("Backend Developer Interview");

      await user.click(screen.getByRole("button", { name: "Pin" }));

      await vi.waitFor(() => expect(marketplaceApi.pinMarketplaceQuestionSet).toHaveBeenCalledWith("set-1"));
      expect(await screen.findByText("Question set pinned.")).toBeInTheDocument();
    },
    15000
  );

  test(
    "AMKT-6: clicking View opens the detail panel with data from getMarketplaceQuestionSetById",
    async () => {
      marketplaceApi.listMarketplaceQuestionSets.mockResolvedValue({ items: [item()], totalCount: 1 });
      marketplaceApi.getMarketplaceQuestionSetById.mockResolvedValue(
        detail({ practitioners: [{ candidateUserId: "u1", candidateName: "Tran Thi B", candidateEmail: "b@example.com", status: "COMPLETED" }] })
      );
      const user = userEvent.setup();
      renderWithProviders(<AdminMarketplacePage />);
      await findFirstText("Backend Developer Interview");

      await user.click(screen.getByRole("button", { name: "View" }));

      await vi.waitFor(() => expect(marketplaceApi.getMarketplaceQuestionSetById).toHaveBeenCalledWith("set-1"));
      expect(await screen.findByText("Tran Thi B", {}, { timeout: 10000 })).toBeInTheDocument();
    },
    15000
  );
});
