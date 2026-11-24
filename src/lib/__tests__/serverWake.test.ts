import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GIVE_UP_MS,
  PING_GAP_MS,
  PING_TIMEOUT_MS,
  WARM_UP_GAP_MS,
  createServerWake,
  healthUrlFrom,
  type WakeDeps,
} from "../serverWake";

/** A ping the test resolves by hand. */
function pingControl() {
  const pending: Array<(ok: boolean) => void> = [];
  const ping = vi.fn<WakeDeps["ping"]>(() => new Promise<boolean>((resolve) => pending.push(resolve)));
  const answer = async (ok: boolean) => {
    const next = pending.shift();
    if (!next) throw new Error("no ping in flight");
    next(ok);
    await Promise.resolve();
    await Promise.resolve();
  };
  return { ping, answer, inFlight: () => pending.length };
}

function setup(over: Partial<WakeDeps> = {}) {
  const ctl = pingControl();
  let disabled = false;
  let stored: number | null = null;
  const deps: WakeDeps = {
    now: () => Date.now(),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    healthUrl: () => "https://x.onrender.com/",
    ping: ctl.ping,
    isDisabled: () => disabled,
    loadWarmUpAt: () => stored,
    saveWarmUpAt: (at) => {
      stored = at;
    },
    ...over,
  };
  const wake = createServerWake(deps);
  return { wake, ...ctl, disable: (v: boolean) => (disabled = v) };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("serverWake core: reports", () => {
  it("reportSlow sets waking with since = the request's start, and pings the health URL", () => {
    const { wake, ping } = setup();
    wake.reportSlow(995_000);
    expect(wake.getSnapshot()).toEqual({ state: "waking", since: 995_000, wokeAt: null, gaveUp: false });
    expect(ping).toHaveBeenCalledTimes(1);
    expect(ping).toHaveBeenCalledWith("https://x.onrender.com/", PING_TIMEOUT_MS);
  });

  it("reportUnreachable sets waking with since = now", () => {
    const { wake } = setup();
    wake.reportUnreachable();
    expect(wake.getSnapshot()).toMatchObject({ state: "waking", since: 1_000_000 });
  });

  it("since is set by the first report only", () => {
    const { wake } = setup();
    wake.reportSlow(990_000);
    vi.advanceTimersByTime(3_000);
    wake.reportUnreachable();
    wake.reportSlow(999_999);
    expect(wake.getSnapshot().since).toBe(990_000);
  });

  it("notifies subscribers on change", () => {
    const { wake } = setup();
    const l = vi.fn();
    wake.subscribe(l);
    wake.reportUnreachable();
    expect(l).toHaveBeenCalledTimes(1);
  });

  it("does nothing without a health URL", () => {
    const { wake, ping } = setup({ healthUrl: () => null });
    wake.reportUnreachable();
    wake.reportSlow(1);
    wake.warmUp();
    wake.retry();
    expect(wake.getSnapshot().state).toBe("awake");
    expect(ping).not.toHaveBeenCalled();
  });

  it("does nothing while a demo transport is installed", () => {
    const { wake, ping, disable } = setup();
    disable(true);
    wake.reportUnreachable();
    wake.reportSlow(Date.now());
    wake.warmUp();
    wake.retry();
    expect(wake.getSnapshot().state).toBe("awake");
    expect(ping).not.toHaveBeenCalled();
  });
});

describe("serverWake core: pinging", () => {
  it("keeps one ping in flight at a time, with PING_GAP_MS between pings", async () => {
    const { wake, ping, answer, inFlight } = setup();
    wake.reportUnreachable();
    wake.reportSlow(Date.now()); // a second report never starts a second ping
    expect(ping).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30_000); // still in flight: nothing new
    expect(ping).toHaveBeenCalledTimes(1);

    await answer(false);
    expect(inFlight()).toBe(0);
    vi.advanceTimersByTime(PING_GAP_MS - 1);
    expect(ping).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(ping).toHaveBeenCalledTimes(2);
    expect(inFlight()).toBe(1);
  });

  it("the first 2xx sets awake (since cleared, wokeAt set) and calls onAwake exactly once", async () => {
    const { wake, ping, answer } = setup();
    const awake = vi.fn();
    wake.onAwake(awake);
    wake.reportSlow(995_000);
    await answer(false);
    vi.advanceTimersByTime(PING_GAP_MS);
    vi.setSystemTime(1_040_000);
    await answer(true);
    expect(wake.getSnapshot()).toEqual({ state: "awake", since: null, wokeAt: 1_040_000, gaveUp: false });
    expect(awake).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(GIVE_UP_MS * 2); // no more pings, no give-up, no second call
    expect(ping).toHaveBeenCalledTimes(2);
    expect(awake).toHaveBeenCalledTimes(1);
    expect(wake.getSnapshot().gaveUp).toBe(false);
  });

  it("wokeAt is cleared by the next report", async () => {
    const { wake, answer } = setup();
    wake.reportUnreachable();
    await answer(true);
    expect(wake.getSnapshot().wokeAt).not.toBeNull();
    wake.reportSlow(Date.now());
    expect(wake.getSnapshot().wokeAt).toBeNull();
  });

  it("a removed onAwake listener is not called", async () => {
    const { wake, answer } = setup();
    const l = vi.fn();
    const off = wake.onAwake(l);
    off();
    wake.reportUnreachable();
    await answer(true);
    expect(l).not.toHaveBeenCalled();
  });

  it("gives up GIVE_UP_MS after since and stops pinging; Try again restarts", async () => {
    const { wake, ping, answer, inFlight } = setup();
    wake.reportSlow(Date.now());
    // Fail every ping until just before the give-up.
    while (Date.now() < 1_000_000 + GIVE_UP_MS - PING_GAP_MS) {
      await answer(false);
      vi.advanceTimersByTime(PING_GAP_MS);
    }
    expect(wake.getSnapshot().gaveUp).toBe(false);
    await answer(false);
    vi.advanceTimersByTime(PING_GAP_MS);
    expect(wake.getSnapshot()).toMatchObject({ state: "waking", gaveUp: true });
    const calls = ping.mock.calls.length;
    if (inFlight()) await answer(false);
    vi.advanceTimersByTime(60_000);
    expect(ping).toHaveBeenCalledTimes(calls);

    vi.setSystemTime(2_000_000);
    wake.retry();
    expect(wake.getSnapshot()).toEqual({ state: "waking", since: 2_000_000, wokeAt: null, gaveUp: false });
    expect(ping).toHaveBeenCalledTimes(calls + 1);
  });

  it("a report after the give-up keeps it until Try again", () => {
    const { wake } = setup();
    wake.reportUnreachable();
    vi.advanceTimersByTime(GIVE_UP_MS);
    expect(wake.getSnapshot().gaveUp).toBe(true);
    wake.reportUnreachable();
    expect(wake.getSnapshot()).toMatchObject({ gaveUp: true, since: 1_000_000 });
  });

  it("a ping that answers after the give-up still wakes", async () => {
    const { wake, answer } = setup();
    const l = vi.fn();
    wake.onAwake(l);
    wake.reportUnreachable();
    vi.advanceTimersByTime(GIVE_UP_MS); // the first ping is still in flight
    expect(wake.getSnapshot().gaveUp).toBe(true);
    await answer(true);
    expect(wake.getSnapshot()).toMatchObject({ state: "awake", gaveUp: false });
    expect(l).toHaveBeenCalledTimes(1);
  });

  it("Try again while a ping is in flight does not start a second one", () => {
    const { wake, ping } = setup();
    wake.reportUnreachable();
    vi.advanceTimersByTime(GIVE_UP_MS);
    wake.retry();
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it("a ping that rejects counts as a failure", async () => {
    const ping = vi.fn(() => Promise.reject(new Error("boom")));
    const { wake } = setup({ ping });
    wake.reportUnreachable();
    await Promise.resolve();
    await Promise.resolve();
    vi.advanceTimersByTime(PING_GAP_MS);
    expect(ping).toHaveBeenCalledTimes(2);
    expect(wake.getSnapshot().state).toBe("waking");
  });
});

describe("serverWake core: warmUp", () => {
  it("one ping, never waking, at most once per WARM_UP_GAP_MS", async () => {
    const { wake, ping, answer } = setup();
    const l = vi.fn();
    wake.subscribe(l);
    wake.warmUp();
    expect(ping).toHaveBeenCalledTimes(1);
    await answer(false);
    vi.advanceTimersByTime(PING_GAP_MS * 3);
    expect(ping).toHaveBeenCalledTimes(1); // a failed warm-up does not loop
    expect(wake.getSnapshot().state).toBe("awake");
    expect(l).not.toHaveBeenCalled();

    vi.advanceTimersByTime(WARM_UP_GAP_MS - PING_GAP_MS * 3 - 1);
    wake.warmUp();
    expect(ping).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    wake.warmUp();
    expect(ping).toHaveBeenCalledTimes(2);
  });

  it("the stored time survives a new instance (a reload in the same tab)", () => {
    let stored: number | null = null;
    const store = { loadWarmUpAt: () => stored, saveWarmUpAt: (at: number) => void (stored = at) };
    const first = setup(store);
    first.wake.warmUp();
    const second = setup(store);
    second.wake.warmUp();
    expect(second.ping).not.toHaveBeenCalled();
  });

  it("a warm-up in flight is the one ping when a wake starts; its 2xx ends the wake", async () => {
    const { wake, ping, answer } = setup();
    const l = vi.fn();
    wake.onAwake(l);
    wake.warmUp();
    wake.reportSlow(Date.now());
    expect(ping).toHaveBeenCalledTimes(1);
    await answer(true);
    expect(wake.getSnapshot().state).toBe("awake");
    expect(l).toHaveBeenCalledTimes(1);
  });
});

describe("healthUrlFrom", () => {
  it("keeps only the origin of NEXT_PUBLIC_API_URL", () => {
    expect(healthUrlFrom("https://x.onrender.com/api")).toBe("https://x.onrender.com/");
    expect(healthUrlFrom("https://x.onrender.com/api/")).toBe("https://x.onrender.com/");
    expect(healthUrlFrom("http://localhost:8000/api")).toBe("http://localhost:8000/");
  });

  it("a bad or missing value gives no URL", () => {
    expect(healthUrlFrom(undefined)).toBeNull();
    expect(healthUrlFrom("")).toBeNull();
    expect(healthUrlFrom("not a url")).toBeNull();
    expect(healthUrlFrom("/api")).toBeNull();
    expect(healthUrlFrom("ftp://x.test/api")).toBeNull();
  });
});
