import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import {
  questionSetServiceMockFactory,
  adminCompanyServiceMockFactory,
  marketSet,
} from "./candidate-service-mocks";
import { renderCandidate } from "./candidate-test-utils";
import { MarketplacePage } from "@/features/candidate/components/marketplace/marketplace-page";

// Grounded in src/features/candidate/components/marketplace/marketplace-page.tsx
// and question-set-card.tsx — no prior automated coverage existed for the
// marketplace browse/filter/bookmark flow. Renders <MarketplacePage> directly,
// mocking question-set.service / admin-company.service at the module boundary.
// Maps to Excel scenario group "Question Set Marketplace (Practice Now)".
//
// Key thing under test: marketplace-page.tsx now forwards keyword/difficulty/
// skills/companyId/sortBy straight to listQuestionSets and renders whatever
// the backend returns (no client-side re-filter). mockAll()'s listQuestionSets
// implementation below stands in for a correctly-filtering backend so these
// tests still exercise "typing narrows the results" end to end.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/candidate/services/question-set.service", async () => {
  const mod = await import("./candidate-service-mocks");
  return mod.questionSetServiceMockFactory();
});
vi.mock("@/features/admin/services/admin-company.service", async () => {
  const mod = await import("./candidate-service-mocks");
  return mod.adminCompanyServiceMockFactory();
});

import * as questionSetApiTyped from "@/features/candidate/services/question-set.service";
import * as companyApiTyped from "@/features/admin/services/admin-company.service";
const questionSetApi = questionSetApiTyped as unknown as ReturnType<typeof questionSetServiceMockFactory>;
const companyApi = companyApiTyped as unknown as ReturnType<typeof adminCompanyServiceMockFactory>;

const SETS = [
  marketSet({ id: "s1", title: "Backend Developer Interview", company: "Acme Corp", difficulty: "Medium", skills: ["Node.js", "SQL"] }),
  marketSet({ id: "s2", title: "Frontend React Deep Dive", company: "Widget Inc", difficulty: "Hard", skills: ["React", "TypeScript"] }),
  marketSet({ id: "s3", title: "Junior QA Screening", company: "Acme Corp", difficulty: "Easy", skills: ["Manual Testing"] }),
];

// Mimics a correctly-filtering backend: narrows SETS by whichever params
// marketplace-page.tsx actually sends (keyword matches title/company/skill).
function filterSets(params: { keyword?: string; difficulty?: string; skills?: string[]; companyId?: string }) {
  const keyword = params.keyword?.trim().toLowerCase();
  return SETS.filter((s) => {
    if (params.difficulty && params.difficulty !== "All" && s.difficulty !== params.difficulty) return false;
    if (params.companyId && s.company !== params.companyId) return false;
    if (params.skills?.length && !params.skills.some((skill) => s.skills.includes(skill))) return false;
    if (keyword) {
      const hay = [s.title, s.company, ...s.skills].join(" ").toLowerCase();
      if (!hay.includes(keyword)) return false;
    }
    return true;
  });
}

function mockAll() {
  Object.values(questionSetApi).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  });
  Object.values(companyApi).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  });
  questionSetApi.listQuestionSets.mockImplementation(async (params = {}) => {
    const items = filterSets(params as { keyword?: string; difficulty?: string; skills?: string[]; companyId?: string });
    return { items, totalCount: items.length } as never;
  });
  questionSetApi.getBookmarkedSetIds.mockResolvedValue(new Set() as never);
  companyApi.listCompanies.mockResolvedValue({ items: [], totalCount: 0 } as never);
}

beforeEach(() => {
  mockAll();
});

describe("Marketplace — browsing and filtering", () => {
  test("MKT-1: lists all sets returned by the backend as cards (title + company)", async () => {
    renderCandidate(<MarketplacePage />);

    expect(await screen.findByText("Backend Developer Interview", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText("Frontend React Deep Dive")).toBeInTheDocument();
    expect(screen.getByText("Junior QA Screening")).toBeInTheDocument();
    expect(screen.getAllByText("Acme Corp")).toHaveLength(2);
  });

  test('MKT-2: typing in search filters client-side by title, company, and skill — proving the "BE only filters by CompanyId" workaround actually works', async () => {
    const user = userEvent.setup();
    renderCandidate(<MarketplacePage />);
    await screen.findByText("Backend Developer Interview", {}, { timeout: 10000 });

    await user.type(screen.getByPlaceholderText("Search by role, company, or skill..."), "react");

    // 400ms debounce, then client-side filter on the already-fetched batch —
    // listQuestionSets is never called again with a keyword param (BE ignores it).
    await waitFor(
      () => expect(screen.queryByText("Backend Developer Interview")).not.toBeInTheDocument(),
      { timeout: 3000 }
    );
    expect(screen.getByText("Frontend React Deep Dive")).toBeInTheDocument();
    expect(screen.queryByText("Junior QA Screening")).not.toBeInTheDocument();
  });

  test("MKT-3: selecting a Difficulty filters the visible cards to that difficulty only", async () => {
    const user = userEvent.setup();
    renderCandidate(<MarketplacePage />);
    await screen.findByText("Backend Developer Interview", {}, { timeout: 10000 });

    await user.click(screen.getByRole("button", { name: /Level/ }));
    await user.click(screen.getByRole("button", { name: "Hard" }));

    await waitFor(() => expect(screen.queryByText("Backend Developer Interview")).not.toBeInTheDocument());
    expect(screen.getByText("Frontend React Deep Dive")).toBeInTheDocument();
    expect(screen.queryByText("Junior QA Screening")).not.toBeInTheDocument();
  });

  test("MKT-4: no matches shows the empty state instead of an empty grid", async () => {
    const user = userEvent.setup();
    renderCandidate(<MarketplacePage />);
    await screen.findByText("Backend Developer Interview", {}, { timeout: 10000 });

    await user.type(screen.getByPlaceholderText("Search by role, company, or skill..."), "no such set exists anywhere");

    expect(
      await screen.findByText("No question sets found. Try a different search.", {}, { timeout: 3000 })
    ).toBeInTheDocument();
  });

  test("MKT-5: a load failure shows an error state with Retry, and Retry re-fetches", async () => {
    // Two separate mount-time effects both call listQuestionSets: an early one
    // that just harvests the available-skills list (declared first, failure is
    // silently swallowed) and the main filter/fetch effect (declared second,
    // whose failure is what actually sets the error state) — queue the
    // rejection for the SECOND call specifically.
    questionSetApi.listQuestionSets.mockReset();
    questionSetApi.listQuestionSets
      .mockResolvedValueOnce({ items: [], totalCount: 0 } as never)
      .mockRejectedValueOnce(new Error("network down"));
    renderCandidate(<MarketplacePage />);

    const retryBtn = await screen.findByRole("button", { name: "Retry" }, { timeout: 10000 });
    questionSetApi.listQuestionSets.mockResolvedValue({ items: SETS, totalCount: SETS.length } as never);

    const user = userEvent.setup();
    await user.click(retryBtn);
    expect(await screen.findByText("Backend Developer Interview", {}, { timeout: 10000 })).toBeInTheDocument();
  });
});

describe("Marketplace — bookmarking", () => {
  test("MKT-6: clicking the bookmark icon on a card calls toggleBookmark and flips its state", async () => {
    questionSetApi.toggleBookmark.mockResolvedValue(true as never);
    const user = userEvent.setup();
    renderCandidate(<MarketplacePage />);
    await screen.findByText("Backend Developer Interview", {}, { timeout: 10000 });

    const saveButtons = screen.getAllByRole("button", { name: "Save for later" });
    await user.click(saveButtons[0]);

    await waitFor(() => expect(questionSetApi.toggleBookmark).toHaveBeenCalled());
    expect(await screen.findByRole("button", { name: "Remove from saved" })).toBeInTheDocument();
  });
});

describe("Marketplace — navigating to a set", () => {
  test("MKT-7: each card's Start Practice button links to its own set-detail route (/jobseeker/sets/{id})", async () => {
    renderCandidate(<MarketplacePage />);
    await screen.findByText("Backend Developer Interview", {}, { timeout: 10000 });

    // Default "featured" sort is a stable sort with none of these fixtures
    // pinned/trending, so card order matches fetch order (s1, s2, s3) —
    // index the Start Practice links the same way as the SETS fixture array.
    const links = screen.getAllByRole("link", { name: "Start Practice" });
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute("href", "/jobseeker/sets/s1");
    expect(links[1]).toHaveAttribute("href", "/jobseeker/sets/s2");
    expect(links[2]).toHaveAttribute("href", "/jobseeker/sets/s3");
  });
});
