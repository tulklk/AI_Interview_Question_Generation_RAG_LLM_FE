import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import {
  studioServiceMockFactory,
  bootstrapStudio,
  freeSubscriptionReady,
  renderStudio,
  getMockedGetMySubscription,
} from "./studio-test-utils";
import { StudioPage } from "@/features/studio/components/studio-page";

// Grounded in src/features/studio/components/sources-panel.tsx's SampleJdModal
// and src/features/studio/hooks/use-studio.ts's saveJobDescription. Maps to
// Excel sheet RAG027 (Sample JD modal). Unit-test rewrite of
// studio-sample-jd.spec.ts. Draft project (no JD yet, Sources panel unlocked).

// language-context.tsx defaults `lang` to "en" whenever nothing is in
// localStorage (getStoredLang()'s fallback) — sample-jd-modal.tsx's
// `locale = lang === "en" ? "en" : "vi"` then renders the sample JD's
// English text, not the Vietnamese one this constant used to assume.
const SAMPLE_JD_SNIPPET = "We are looking for a Fullstack Developer";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/studio/services/studio.service", () => studioServiceMockFactory());

import * as studioApiTyped from "@/features/studio/services/studio.service";
const studioApi = studioApiTyped as unknown as ReturnType<typeof studioServiceMockFactory>;

beforeEach(async () => {
  Object.values(studioApi).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  });
  (await getMockedGetMySubscription()).mockReset();
  (await getMockedGetMySubscription()).mockResolvedValue(freeSubscriptionReady() as never);
});

async function openSampleJdModal() {
  bootstrapStudio(studioApi, { hasJd: false });
  const user = userEvent.setup();
  renderStudio(<StudioPage />);
  await user.click(await screen.findByRole("button", { name: "Sample JD" }, { timeout: 10000 }));
  // getByText defaults to exact-match against an element's FULL text content;
  // the snippet is only the opening sentence of a much longer <pre> block, so
  // this needs a substring (regex) matcher, not the default exact string.
  expect(await screen.findByText(new RegExp(SAMPLE_JD_SNIPPET))).toBeInTheDocument();
  return user;
}

describe("RAG027 — Studio Sample JD modal", () => {
  test("RAG027-2: the close (X) button dismisses the modal without touching the JD field", async () => {
    const user = await openSampleJdModal();
    const dialog = document.querySelector("div.fixed.inset-0.z-\\[200\\]")!;
    await user.click(dialog.querySelector("button")!);
    await vi.waitFor(
      () => expect(document.querySelector("div.fixed.inset-0.z-\\[200\\]")).not.toBeInTheDocument(),
      { timeout: 2000 }
    );
    expect(screen.getByPlaceholderText("Paste your job description here…")).toHaveValue("");
  });

  test("RAG027-3: clicking the backdrop also dismisses the modal", async () => {
    const user = await openSampleJdModal();
    // The backdrop is the semi-transparent overlay div with the onClick=close
    // handler, a CHILD of the outer z-[200] wrapper — not the wrapper itself
    // (which also contains the card, so clicking the wrapper node directly
    // never bubbles into the backdrop's own onClick).
    const backdrop = document.querySelector("div.absolute.inset-0.bg-black\\/50")!;
    await user.click(backdrop);
    await vi.waitFor(
      () => expect(document.querySelector("div.fixed.inset-0.z-\\[200\\]")).not.toBeInTheDocument(),
      { timeout: 2000 }
    );
  });

  test("RAG027-4 (finding): pressing Escape does NOT close the Sample JD modal — unlike the HR upgrade modal", async () => {
    // SampleJdModal registers no keydown listener at all (contrast with
    // hr-upgrade-modal.tsx's onKey Escape handler) — an inconsistency in
    // modal dismissal behavior across the app.
    const user = await openSampleJdModal();
    await user.keyboard("{Escape}");
    expect(document.querySelector("div.fixed.inset-0.z-\\[200\\]")).toBeInTheDocument();
  });

  test('RAG027-5: the Copy button copies the sample JD to the clipboard and shows "Copied" feedback that reverts', async () => {
    const user = await openSampleJdModal();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(await screen.findByRole("button", { name: "Copied" }, { timeout: 5000 })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(SAMPLE_JD_SNIPPET));

    // Reverts back to "Copy" after the 1.8s feedback window, and the modal
    // is still open (Copy doesn't close it, unlike "Use this sample").
    expect(await screen.findByRole("button", { name: "Copy" }, { timeout: 3000 })).toBeInTheDocument();
    expect(document.querySelector("div.fixed.inset-0.z-\\[200\\]")).toBeInTheDocument();
  });
});
