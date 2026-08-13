import { describe, test, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { ContentTable } from "@/features/admin/components/content/content-table";
import type { ContentSession } from "@/features/admin/types/admin";

// Grounded in src/features/admin/components/content/content-table.tsx — the
// per-row table on Admin's Content page (src/app/admin/content/page.tsx).
// No prior automated coverage existed. ContentTable takes `sessions` as a
// prop with no data-fetching of its own, so it's rendered directly with a
// fixture row rather than through the full page. Its per-row Delete (Trash2)
// button has no backend to delete against, so it's rendered `disabled` with a
// `title={t.common.comingSoon}` tooltip instead of a silently non-functional
// active button (dead-button fix).

function session(overrides: Partial<ContentSession> = {}): ContentSession {
  return {
    id: "sess-1",
    jobTitle: "Senior Backend Developer",
    recruiter: "Jane Doe",
    recruiterEmail: "jane@example.com",
    date: "2026-01-01",
    daysAgo: 5,
    questionsCount: 12,
    exported: true,
    role: "Backend",
    roleColor: "text-blue-600",
    roleBg: "bg-blue-50",
    ...overrides,
  };
}

describe("Admin Content Table", () => {
  test("ACT-1: renders a session row with job title, recruiter, and question count", () => {
    renderWithProviders(<ContentTable sessions={[session()]} />);

    expect(screen.getByText("Senior Backend Developer")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  test('ACT-2: the per-row Delete button is disabled with a Coming soon tooltip, not a silently broken active button', () => {
    renderWithProviders(<ContentTable sessions={[session()]} />);

    const deleteBtn = screen.getByTitle("Coming soon");
    expect(deleteBtn.tagName).toBe("BUTTON");
    expect(deleteBtn).toBeDisabled();
  });

  test("ACT-3: the View link still navigates to the session's history detail page (unaffected by the Delete fix)", () => {
    renderWithProviders(<ContentTable sessions={[session({ id: "sess-42" })]} />);

    const viewLink = screen.getByRole("link");
    expect(viewLink).toHaveAttribute("href", "/hr/history/sess-42");
  });
});
