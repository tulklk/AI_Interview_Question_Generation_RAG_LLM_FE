import { describe, test, expect } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { InfoTooltip } from "@/features/candidate/components/ui/info-tooltip";

// Grounded in src/features/candidate/components/ui/info-tooltip.tsx (a
// self-contained, no-external-lib hover/focus tooltip used by kpi-card.tsx
// on the jobseeker dashboard). Maps to Excel sheet UI015 (tooltip hover
// display). Unit-test rewrite of ui-visual-layout-5.spec.ts's UI015-1 —
// tested against the reusable tooltip component directly rather than the
// full dashboard page, since the show/hide behavior under test lives
// entirely here, not in dashboard-specific wiring.

describe("UI015 — info tooltip hover/focus display", () => {
  test("UI015-1: the tooltip shows on hover and hides on mouse-out", async () => {
    const user = userEvent.setup();
    const label = "Total number of practice sessions you've completed.";
    render(<InfoTooltip label={label} />);

    const tooltip = screen.getByRole("tooltip", { name: label });
    // The tooltip element is always in the DOM — visibility is driven by
    // opacity/pointer-events classes, not mount state (Playwright's
    // toBeVisible() ignores opacity:0, which is why the original spec
    // asserted directly on these classes too).
    expect(tooltip).toHaveClass("opacity-0");
    expect(tooltip).toHaveClass("pointer-events-none");

    const trigger = screen.getByRole("button");
    await user.hover(trigger);
    expect(tooltip).toHaveClass("opacity-100");
    expect(tooltip).toHaveClass("pointer-events-auto");

    await user.unhover(trigger);
    expect(tooltip).toHaveClass("opacity-0");
    expect(tooltip).toHaveClass("pointer-events-none");
  });
});
