import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Count-up KPI numbers (admin/candidate/HR dashboards, feedback score,
// leaderboard, roadmap, stat cards — 9 call sites, all `animate(0, target,
// { duration, ease, onUpdate })`) drive a real ~1.2s requestAnimationFrame
// loop via framer-motion. Under the full suite's CPU contention that can
// occasionally outrun a test's waitFor timeout — flaky, not a real bug.
// Jump straight to the target value instead of animating for real.
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return {
    ...actual,
    animate: (_from: number, to: number, options?: { onUpdate?: (v: number) => void }) => {
      options?.onUpdate?.(to);
      return { stop: () => {} };
    },
  };
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// jsdom doesn't implement these — framer-motion / lucide-react / Radix-style
// components commonly touch them even in tests that never resize/observe.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = window.ResizeObserver ?? ResizeObserverStub;

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
window.IntersectionObserver = window.IntersectionObserver ?? IntersectionObserverStub;

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}

// next/navigation's router isn't wired to a real App Router in unit tests —
// individual test files mock the specific hooks (useRouter/usePathname) they
// need via vi.mock("next/navigation", ...).

// jsdom has never implemented the Clipboard API — navigator.clipboard is
// undefined out of the box, so vi.spyOn(navigator.clipboard, ...) has
// nothing to attach to. Stub it once per test file so individual tests can
// spy on/assert against writeText.
if (!navigator.clipboard) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(""),
    },
  });
}
