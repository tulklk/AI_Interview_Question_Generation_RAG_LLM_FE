import { describe, test, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { PremiumRevokedDialog } from "@/shared/components/ui/premium-revoked-dialog";

// Grounded in src/shared/components/ui/premium-revoked-dialog.tsx — shown when
// an admin revokes a user's Premium plan while they're actively using the app
// (PREMIUM → FREE transition detected by jobseeker-app-shell.tsx / hr's
// app-shell.tsx). Brand-new component added alongside the subscription-realtime
// feature; had zero test coverage before this file.

describe("PremiumRevokedDialog", () => {
  test("PRD-1: renders nothing when closed", () => {
    renderWithProviders(<PremiumRevokedDialog open={false} onClose={vi.fn()} />);
    expect(screen.queryByText("Premium Plan Revoked")).not.toBeInTheDocument();
  });

  test("PRD-2: when open, shows the revoked title and the HR lost-features list by default", async () => {
    renderWithProviders(<PremiumRevokedDialog open onClose={vi.fn()} />);

    expect(await screen.findByText("Premium Plan Revoked")).toBeInTheDocument();
    expect(screen.getByText("Free Plan")).toBeInTheDocument();
    expect(screen.getByText("Unlimited question set generation")).toBeInTheDocument();
    expect(screen.getByText("Export PDF / DOCX")).toBeInTheDocument();
    expect(screen.getByText("Ask-AI in Studio")).toBeInTheDocument();
    expect(screen.getByText("Publish to Marketplace")).toBeInTheDocument();
  });

  test("PRD-3: audience=\"candidate\" swaps in the candidate lost-features list instead of HR's", async () => {
    renderWithProviders(<PremiumRevokedDialog open onClose={vi.fn()} audience="candidate" />);

    expect(await screen.findByText("Premium Plan Revoked")).toBeInTheDocument();
    expect(screen.getByText("Unlimited practice sessions")).toBeInTheDocument();
    expect(screen.getByText("Advanced & detailed AI feedback")).toBeInTheDocument();
    expect(screen.getByText("Access to premium question bank")).toBeInTheDocument();
    expect(screen.queryByText("Publish to Marketplace")).not.toBeInTheDocument();
  });

  test("PRD-4: no Upgrade CTA is rendered when onUpgrade isn't provided", async () => {
    renderWithProviders(<PremiumRevokedDialog open onClose={vi.fn()} />);
    await screen.findByText("Premium Plan Revoked");
    expect(screen.queryByRole("button", { name: "Upgrade Again →" })).not.toBeInTheDocument();
  });

  test("PRD-5: clicking \"Upgrade Again\" calls onUpgrade then onClose", async () => {
    const onUpgrade = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<PremiumRevokedDialog open onClose={onClose} onUpgrade={onUpgrade} />);

    await user.click(await screen.findByRole("button", { name: "Upgrade Again →" }));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("PRD-6: clicking the bottom \"Close\" button calls onClose without onUpgrade", async () => {
    const onUpgrade = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<PremiumRevokedDialog open onClose={onClose} onUpgrade={onUpgrade} />);

    // Both the header X button and this bottom button expose the accessible
    // name "Close" (aria-label vs. text content respectively) — DOM order puts
    // the header X button first, this one second.
    const closeButtons = await screen.findAllByRole("button", { name: "Close" });
    await user.click(closeButtons[1]);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onUpgrade).not.toHaveBeenCalled();
  });

  test("PRD-7: clicking the backdrop calls onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<PremiumRevokedDialog open onClose={onClose} />);
    await screen.findByText("Premium Plan Revoked");

    const backdrop = document.querySelector<HTMLElement>(".fixed.inset-0.z-\\[99999\\] > .absolute.inset-0")!;
    expect(backdrop).toBeInTheDocument();
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("PRD-8: pressing Escape calls onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<PremiumRevokedDialog open onClose={onClose} />);
    await screen.findByText("Premium Plan Revoked");

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("PRD-9: the X close button in the header also calls onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<PremiumRevokedDialog open onClose={onClose} />);
    await screen.findByText("Premium Plan Revoked");

    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    await user.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
