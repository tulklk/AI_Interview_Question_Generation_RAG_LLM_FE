import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { useSubscriptionRealtime } from "@/features/subscription/hooks/use-subscription-realtime";
import { createSubscriptionPaymentHubConnection } from "@/features/subscription/services/subscription-payment-hub";

// Grounded in src/features/subscription/hooks/use-subscription-realtime.ts and
// src/features/subscription/services/subscription-payment-hub.ts — the P0 fix
// this session made was createSubscriptionPaymentHubConnection() returning
// `null` instead of throwing synchronously on a construction failure (e.g. an
// unresolvable/malformed hub URL). Before the fix that throw crashed this
// hook's effect (and the whole component tree, since every candidate/HR test
// renders a provider that calls this hook unconditionally). No dedicated test
// exercised the hook itself — every other test only exercised it *implicitly*
// by rendering something that happens to use it.
//
// @microsoft/signalr is intentionally NOT mocked here: in jsdom, with no
// NEXT_PUBLIC_API_BASE_URL configured, connection construction genuinely fails
// and createSubscriptionPaymentHubConnection() genuinely returns null — so
// this test exercises the real production fallback path (poll-only), not a
// simulated one.

function Probe({ onChange, enabled }: { onChange: () => void; enabled?: boolean }) {
  useSubscriptionRealtime({ onSubscriptionChanged: onChange, enabled });
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createSubscriptionPaymentHubConnection", () => {
  test("SUBRT-1: never throws even when construction fails in jsdom — callers can always safely check for null", () => {
    expect(() => createSubscriptionPaymentHubConnection()).not.toThrow();
  });
});

describe("useSubscriptionRealtime", () => {
  test("SUBRT-2: mounting never crashes, even though the real SignalR connection fails to construct in jsdom", () => {
    expect(() => render(<Probe onChange={vi.fn()} />)).not.toThrow();
  });

  test("SUBRT-3: the 30s fallback poll calls onSubscriptionChanged even though SignalR is unavailable", () => {
    const onChange = vi.fn();
    render(<Probe onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(30_000);
    expect(onChange).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30_000);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  test("SUBRT-4: enabled=false skips setup entirely — no poll ever fires", () => {
    const onChange = vi.fn();
    render(<Probe onChange={onChange} enabled={false} />);

    vi.advanceTimersByTime(120_000);
    expect(onChange).not.toHaveBeenCalled();
  });

  test("SUBRT-5: unmounting clears the fallback poll — no further calls after cleanup", () => {
    const onChange = vi.fn();
    const { unmount } = render(<Probe onChange={onChange} />);

    vi.advanceTimersByTime(30_000);
    expect(onChange).toHaveBeenCalledTimes(1);

    unmount();
    vi.advanceTimersByTime(60_000);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test("SUBRT-6: always calls the latest onSubscriptionChanged, not a stale closure from the first render", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Probe onChange={first} />);

    rerender(<Probe onChange={second} />);
    vi.advanceTimersByTime(30_000);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
