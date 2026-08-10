import { describe, test, expect, vi, beforeEach } from "vitest";
import axios, { type InternalAxiosRequestConfig } from "axios";

// auth.interceptor.ts's performRefresh() posts through its OWN internal
// module-level `refreshClient` — a SEPARATE axios.create() instance from the
// `client` attachAuthInterceptor() is called on, deliberately created
// without any interceptors of its own (see the source comment: "Axios
// instance without auth interceptors — used only for refresh calls"). A
// MockAdapter bound to just the client under test never sees refreshClient's
// calls, since they're a different instance. Mocking axios.create to give
// every call a fresh, independent instance (preserving that isolation) but
// route them all through ONE shared MockAdapter (so both instances hit the
// same mocked "network") gets both properties at once.
const { sharedMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const axiosLib = require("axios");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AxiosMockAdapter = require("axios-mock-adapter");
  const dummy = axiosLib.default.create();
  const adapter = new AxiosMockAdapter(dummy);
  return { sharedMock: adapter };
});

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return {
    ...actual,
    default: {
      ...actual.default,
      create: (config?: Record<string, unknown>) => {
        const instance = actual.default.create(config);
        instance.defaults.adapter = sharedMock.adapter();
        return instance;
      },
    },
  };
});

import { attachAuthInterceptor } from "@/core/interceptors/auth.interceptor";

// Grounded in src/core/interceptors/auth.interceptor.ts and
// src/core/auth/token.service.ts. Maps to Excel sheets RGA001/RGA002/RGA004/
// RGA013 (HRRAGAuthErrorHandling). Unit-test rewrite of auth-error-handling.spec.ts's
// interceptor-behavior tests: exercises attachAuthInterceptor() directly
// against a real axios instance (via axios-mock-adapter), instead of
// rendering a page and observing network calls through it — this is the
// module the tests are actually about, and it has zero React in it.
//
// RGA008-1 ("HR routes have no role gate") and RGA012-1 ("session expiring
// mid-poll") are dropped here: RGA008-1 is an architectural fact (absence of
// a guard component on src/app/hr/*, nothing to render/assert), and RGA012-1
// exercised generate-form.tsx's poll loop, which is fully retired dead code
// (see studio-quota.spec.ts's header comment on the GenerateForm retirement).
// RGA011-1 (raw 5xx message surfacing) is covered separately in
// error-interceptor.test.ts against extractErrorMessage() directly.

vi.mock("@/core/auth/token.service", () => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  setAuthTokens: vi.fn(),
}));

vi.mock("@/core/auth/permissions", () => ({
  clearAuth: vi.fn(),
}));

import { getAccessToken, getRefreshToken, setAuthTokens } from "@/core/auth/token.service";
import { clearAuth } from "@/core/auth/permissions";

function setLocation(pathname: string) {
  Object.defineProperty(window, "location", {
    writable: true,
    configurable: true,
    value: { pathname, assign: vi.fn() },
  });
}

function makeClient() {
  const client = axios.create({ baseURL: "" });
  attachAuthInterceptor(client);
  return { client, mock: sharedMock };
}

beforeEach(() => {
  sharedMock.reset();
  vi.mocked(getAccessToken).mockReturnValue("expired.jwt.token");
  vi.mocked(getRefreshToken).mockReturnValue("some-refresh-token");
  vi.mocked(setAuthTokens).mockReset();
  vi.mocked(clearAuth).mockReset();
  setLocation("/hr/generate-question/manual");
});

describe("RGA — auth interceptor", () => {
  test("RGA001-1: a 401 followed by a successful refresh transparently retries the request", async () => {
    const { client, mock } = makeClient();
    let usersMeCalls = 0;
    mock.onGet("/api/users/me").reply(() => {
      usersMeCalls++;
      return usersMeCalls === 1 ? [401, { message: "Unauthorized" }] : [200, { fullName: "x" }];
    });
    mock.onPost("/api/auth/refresh-token").reply(200, { accessToken: "new.jwt.token", refreshToken: "new-refresh-token" });

    const res = await client.get("/api/users/me");
    expect(res.status).toBe(200);
    expect(usersMeCalls).toBe(2);
    expect(setAuthTokens).toHaveBeenCalledWith("new.jwt.token", "new-refresh-token");
    expect(clearAuth).not.toHaveBeenCalled();
    expect((window.location as unknown as { assign: ReturnType<typeof vi.fn> }).assign).not.toHaveBeenCalled();
  });

  test("RGA002-1: a 401 with a failed refresh clears auth and redirects to login", async () => {
    const { client, mock } = makeClient();
    mock.onGet("/api/users/me").reply(401, { message: "Unauthorized" });
    mock.onPost("/api/auth/refresh-token").reply(401, { message: "Invalid refresh token" });

    await expect(client.get("/api/users/me")).rejects.toMatchObject({ response: { status: 401 } });
    expect(clearAuth).toHaveBeenCalledTimes(1);
    expect((window.location as unknown as { assign: ReturnType<typeof vi.fn> }).assign).toHaveBeenCalledWith("/login");
  });

  test("RGA003-1: no refresh token at all skips the network call and redirects immediately", async () => {
    vi.mocked(getRefreshToken).mockReturnValue(null);
    const { client, mock } = makeClient();
    mock.onGet("/api/users/me").reply(401, { message: "Unauthorized" });
    let refreshCalled = false;
    mock.onPost("/api/auth/refresh-token").reply(() => {
      refreshCalled = true;
      return [401, {}];
    });

    await expect(client.get("/api/users/me")).rejects.toBeTruthy();
    expect(refreshCalled).toBe(false);
    expect(clearAuth).toHaveBeenCalledTimes(1);
  });

  test("RGA004-1: a 401 on the refresh endpoint itself clears auth and redirects, without retrying refresh again", async () => {
    const { client, mock } = makeClient();
    let refreshCallCount = 0;
    mock.onPost("/api/auth/refresh-token").reply(() => {
      refreshCallCount++;
      return [401, { message: "Refresh token expired" }];
    });

    // Calling the refresh endpoint directly through the intercepted client —
    // isRefreshRequest() short-circuits straight to clearAuth+redirect.
    await expect(client.post("/api/auth/refresh-token", {})).rejects.toBeTruthy();
    expect(refreshCallCount).toBe(1);
    expect(clearAuth).toHaveBeenCalledTimes(1);
  });

  test("RGA006-1: 401 on a public auth endpoint (login) does not trigger refresh/redirect", async () => {
    const { client, mock } = makeClient();
    mock.onPost("/api/auth/login").reply(401, { message: "Invalid credentials" });
    let refreshCalled = false;
    mock.onPost("/api/auth/refresh-token").reply(() => {
      refreshCalled = true;
      return [200, {}];
    });

    await expect(client.post("/api/auth/login", {})).rejects.toMatchObject({ response: { status: 401 } });
    expect(refreshCalled).toBe(false);
    expect(clearAuth).not.toHaveBeenCalled();
  });

  test("RGA005-1a: a 403 response is not special-cased — no refresh attempt, no redirect", async () => {
    const { client, mock } = makeClient();
    mock.onGet("/api/users/me").reply(403, { message: "Forbidden" });
    let refreshCalled = false;
    mock.onPost("/api/auth/refresh-token").reply(() => {
      refreshCalled = true;
      return [200, {}];
    });

    await expect(client.get("/api/users/me")).rejects.toMatchObject({ response: { status: 403 } });
    expect(refreshCalled).toBe(false);
    expect(clearAuth).not.toHaveBeenCalled();
  });

  test("RGA005-1b: a 401 on an already-retried request clears auth and redirects, without a second refresh", async () => {
    const { client, mock } = makeClient();
    let usersMeCalls = 0;
    mock.onGet("/api/users/me").reply(() => {
      usersMeCalls++;
      return [401, { message: "Unauthorized" }]; // every call 401s, including the retry
    });
    let refreshCallCount = 0;
    mock.onPost("/api/auth/refresh-token").reply(() => {
      refreshCallCount++;
      return [200, { accessToken: "new.jwt.token", refreshToken: "new-refresh-token" }];
    });

    await expect(client.get("/api/users/me")).rejects.toBeTruthy();
    expect(refreshCallCount).toBe(1); // refreshed once, retried once, then gave up
    expect(usersMeCalls).toBe(2); // original + one retry
    expect(clearAuth).toHaveBeenCalledTimes(1);
  });

  test("RGA017-1 (finding): the interceptor reads tokens via getAccessToken/getRefreshToken, not a cookie", async () => {
    // token.service.ts (mocked above) is a thin wrapper over localStorage —
    // confirming the interceptor calls it (rather than reading any cookie
    // jar) is the unit-testable half of "tokens live in localStorage, not an
    // httpOnly cookie"; localStorage's actual JS-readability is a browser
    // fact, not something this module decides.
    const { client, mock } = makeClient();
    mock.onGet("/api/whatever").reply((config: InternalAxiosRequestConfig) => {
      expect(config.headers?.Authorization).toBe("Bearer expired.jwt.token");
      return [200, {}];
    });
    await client.get("/api/whatever");
    expect(getAccessToken).toHaveBeenCalled();
  });

  test("RGA019-1: a failed refresh triggers clearAuth() (which is responsible for clearing the cached profile)", async () => {
    const { client, mock } = makeClient();
    mock.onGet("/api/users/me").reply(401, { message: "Unauthorized" });
    mock.onPost("/api/auth/refresh-token").reply(401, { message: "Invalid refresh token" });

    await expect(client.get("/api/users/me")).rejects.toBeTruthy();
    expect(clearAuth).toHaveBeenCalledTimes(1);
  });

  test("RGA020-1: a successful refresh passes the server's rotated tokens to setAuthTokens", async () => {
    const { client, mock } = makeClient();
    mock.onGet("/api/users/me").replyOnce(401, { message: "Unauthorized" });
    mock.onGet("/api/users/me").reply(200, {});
    mock.onPost("/api/auth/refresh-token").reply(200, {
      accessToken: "rotated-access-token",
      refreshToken: "rotated-refresh-token",
    });

    await client.get("/api/users/me");
    // setAuthTokens(access, refresh) — the OLD refresh token is never reused.
    expect(setAuthTokens).toHaveBeenCalledWith("rotated-access-token", "rotated-refresh-token");
  });

  test("RGA007-1: two concurrent 401s share a single de-duped refresh call", async () => {
    const { client, mock } = makeClient();
    let usersMeFirstCall = true;
    mock.onGet("/api/users/me").reply(() => {
      if (usersMeFirstCall) {
        usersMeFirstCall = false;
        return [401, { message: "Unauthorized" }];
      }
      return [200, {}];
    });
    let subscriptionFirstCall = true;
    mock.onGet("/api/me/subscription").reply(() => {
      if (subscriptionFirstCall) {
        subscriptionFirstCall = false;
        return [401, { message: "Unauthorized" }];
      }
      return [200, {}];
    });
    let refreshCallCount = 0;
    mock.onPost("/api/auth/refresh-token").reply(async () => {
      refreshCallCount++;
      // Small delay so both 401s land while the first refresh is still in flight.
      await new Promise((r) => setTimeout(r, 50));
      return [200, { accessToken: "new.jwt.token", refreshToken: "new-refresh-token" }];
    });

    const [r1, r2] = await Promise.all([client.get("/api/users/me"), client.get("/api/me/subscription")]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(refreshCallCount).toBe(1);
    expect(clearAuth).not.toHaveBeenCalled();
  });
});
