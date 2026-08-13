import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor, within } from "@testing-library/react";
import { invitationServiceMockFactory, invitation } from "./invitations-mocks";
import { renderCandidate } from "./candidate-test-utils";
import { InvitationsList } from "@/features/candidate/components/invitations/invitations-list";

// Grounded in src/features/candidate/components/invitations/invitations-list.tsx
// — the candidate-side "respond to an HR interview invitation" flow. No prior
// automated coverage existed. Renders <InvitationsList> directly, mocking
// invitation.service at the module boundary. Maps to Excel scenario group
// "Interview Invitations".
//
// IMPORTANT: the component renders BOTH a desktop table row and a separate
// "Mobile card list" row for every invitation at the same time — jsdom has no
// real layout engine, so the `md:hidden`/desktop-only CSS classes that would
// normally hide one of them never actually apply. Company names and the
// "View detail" button therefore each exist TWICE in the DOM. A plain
// getByText/getByRole("button", {name}) is flaky (throws on the run where the
// query happens to see both nodes) — helpers below always take the first
// (desktop) match instead.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/candidate/services/invitation.service", async () => {
  const mod = await import("./invitations-mocks");
  return mod.invitationServiceMockFactory();
});

import * as invitationApiTyped from "@/features/candidate/services/invitation.service";
const invitationApi = invitationApiTyped as unknown as ReturnType<typeof invitationServiceMockFactory>;

async function findFirstText(text: string) {
  return (await screen.findAllByText(text, {}, { timeout: 10000 }))[0];
}
function firstText(text: string) {
  return screen.getAllByText(text)[0];
}
function textCount(text: string) {
  return screen.queryAllByText(text).length;
}
async function findFirstButton(name: string) {
  return (await screen.findAllByRole("button", { name }, { timeout: 10000 }))[0];
}
function firstButton(name: string) {
  return screen.getAllByRole("button", { name })[0];
}

beforeEach(() => {
  Object.values(invitationApi).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  });
});

describe("Invitations — listing and filtering", () => {
  test("INV-1: lists invitations with company name and a live Pending count on the tab", async () => {
    invitationApi.listInvitations.mockResolvedValue([
      invitation({ id: "inv-1", companyName: "Acme Corp", status: "PENDING" }),
      invitation({ id: "inv-2", companyName: "Widget Inc", status: "ACCEPTED" }),
    ] as never);
    renderCandidate(<InvitationsList />);

    expect(await findFirstText("Acme Corp")).toBeInTheDocument();
    expect(firstText("Widget Inc")).toBeInTheDocument();
    // Tab button "Pending" carries a live count badge of 1.
    const pendingTab = screen.getByRole("button", { name: /Pending/ });
    expect(pendingTab).toHaveTextContent("1");
  });

  test("INV-2: clicking the Accepted tab filters the list down to accepted invitations only", async () => {
    invitationApi.listInvitations.mockResolvedValue([
      invitation({ id: "inv-1", companyName: "Acme Corp", status: "PENDING" }),
      invitation({ id: "inv-2", companyName: "Widget Inc", status: "ACCEPTED" }),
    ] as never);
    const user = userEvent.setup();
    renderCandidate(<InvitationsList />);
    await findFirstText("Acme Corp");

    await user.click(screen.getByRole("button", { name: /Accepted/ }));

    expect(textCount("Acme Corp")).toBe(0);
    expect(firstText("Widget Inc")).toBeInTheDocument();
  });

  test("INV-3: no invitations at all shows the empty state", async () => {
    invitationApi.listInvitations.mockResolvedValue([] as never);
    renderCandidate(<InvitationsList />);

    expect(
      await screen.findByText(
        "No invitations yet. Keep practicing — recruiters may invite you to interview based on your results.",
        {}, { timeout: 10000 }
      )
    ).toBeInTheDocument();
  });

  test(
    "INV-4: a load failure shows Retry, and Retry re-fetches",
    async () => {
      invitationApi.listInvitations.mockRejectedValueOnce(new Error("network down"));
      const user = userEvent.setup();
      renderCandidate(<InvitationsList />);

      const retryBtn = await screen.findByRole("button", { name: "Retry" }, { timeout: 10000 });
      invitationApi.listInvitations.mockResolvedValue([invitation({ companyName: "Acme Corp" })] as never);
      await user.click(retryBtn);

      expect(await findFirstText("Acme Corp")).toBeInTheDocument();
    },
    15000
  );
});

describe("Invitations — accepting", () => {
  test("INV-5: Accept opens a modal; an invalid phone number blocks confirm with a validation message", async () => {
    invitationApi.listInvitations.mockResolvedValue([invitation({ id: "inv-1", companyName: "Acme Corp" })] as never);
    const user = userEvent.setup();
    renderCandidate(<InvitationsList />);
    await findFirstText("Acme Corp");

    await user.click(await findFirstButton("View detail"));
    await user.click(await screen.findByRole("button", { name: "Accept" }));
    expect(await screen.findByText("Optionally leave a note or phone number so the recruiter can reach you.")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("0912345678"), "12345"); // doesn't start with 0, too short
    await user.click(screen.getByRole("button", { name: "Accept invitation" }));

    expect(
      await screen.findByText("Enter a valid phone number (10 digits, starting with 0).")
    ).toBeInTheDocument();
    expect(invitationApi.acceptInvitation).not.toHaveBeenCalled();
  });

  test("INV-6: confirming Accept with a valid (or blank) phone calls acceptInvitation and flips the status to Accepted", async () => {
    invitationApi.listInvitations.mockResolvedValue([invitation({ id: "inv-1", companyName: "Acme Corp" })] as never);
    invitationApi.acceptInvitation.mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderCandidate(<InvitationsList />);
    await findFirstText("Acme Corp");

    await user.click(await findFirstButton("View detail"));
    await user.click(await screen.findByRole("button", { name: "Accept" }));
    await screen.findByText("Optionally leave a note or phone number so the recruiter can reach you.");

    await user.type(screen.getByPlaceholderText("0912345678"), "0912345678");
    await user.click(screen.getByRole("button", { name: "Accept invitation" }));

    await waitFor(() =>
      expect(invitationApi.acceptInvitation).toHaveBeenCalledWith("inv-1", {
        responseMessage: undefined,
        phoneNumber: "0912345678",
      })
    );
    expect(await screen.findByText("Invitation accepted")).toBeInTheDocument();
  });

  test('INV-7 (finding): a 409 on accept shows "You\'ve already responded" instead of the generic accept-failed message', async () => {
    invitationApi.listInvitations.mockResolvedValue([invitation({ id: "inv-1", companyName: "Acme Corp" })] as never);
    invitationApi.acceptInvitation.mockRejectedValue({ response: { status: 409 } });
    const user = userEvent.setup();
    renderCandidate(<InvitationsList />);
    await findFirstText("Acme Corp");

    await user.click(await findFirstButton("View detail"));
    await user.click(await screen.findByRole("button", { name: "Accept" }));
    await screen.findByText("Optionally leave a note or phone number so the recruiter can reach you.");
    await user.click(screen.getByRole("button", { name: "Accept invitation" }));

    expect(await screen.findByText("You've already responded to this invitation.")).toBeInTheDocument();
  });
});

describe("Invitations — declining", () => {
  test("INV-8: Decline asks for confirmation first, then calls rejectInvitation and flips the status to Rejected", async () => {
    invitationApi.listInvitations.mockResolvedValue([invitation({ id: "inv-1", companyName: "Acme Corp" })] as never);
    invitationApi.rejectInvitation.mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderCandidate(<InvitationsList />);
    await findFirstText("Acme Corp");

    await user.click(await findFirstButton("View detail"));
    await user.click(await screen.findByRole("button", { name: "Decline" }));

    expect(await screen.findByText("Decline this invitation?")).toBeInTheDocument();
    expect(invitationApi.rejectInvitation).not.toHaveBeenCalled();

    // The detail dialog behind it still renders its own "Decline" button, so
    // scope to the alertdialog to avoid matching both.
    const confirmDialog = screen.getByRole("alertdialog");
    await user.click(within(confirmDialog).getByRole("button", { name: "Decline" }));

    await waitFor(() => expect(invitationApi.rejectInvitation).toHaveBeenCalledWith("inv-1"));
    expect(await screen.findByText("Invitation declined")).toBeInTheDocument();
  });
});
