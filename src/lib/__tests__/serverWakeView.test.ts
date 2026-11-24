import { afterEach, describe, expect, it } from "vitest";
import type { ApiFailureKind } from "../apiClient";
import { installApiTransport } from "../apiTransport";
import { bannerPhase, formatElapsed, showWaitingForServer } from "../serverWakeView";

describe("bannerPhase", () => {
  const since = 1_000_000;
  it("hidden while awake", () => {
    expect(bannerPhase({ state: "awake", gaveUp: false, since: null, now: since })).toBe("hidden");
  });
  it("waking before 45 s, longer from exactly 45 000 ms", () => {
    expect(bannerPhase({ state: "waking", gaveUp: false, since, now: since + 5_000 })).toBe("waking");
    expect(bannerPhase({ state: "waking", gaveUp: false, since, now: since + 44_999 })).toBe("waking");
    expect(bannerPhase({ state: "waking", gaveUp: false, since, now: since + 45_000 })).toBe("longer");
    expect(bannerPhase({ state: "waking", gaveUp: false, since, now: since + 170_000 })).toBe("longer");
  });
  it("down whenever gaveUp", () => {
    expect(bannerPhase({ state: "waking", gaveUp: true, since, now: since + 1 })).toBe("down");
    expect(bannerPhase({ state: "waking", gaveUp: true, since, now: since + 200_000 })).toBe("down");
  });
  it("a clock behind since is still waking", () => {
    expect(bannerPhase({ state: "waking", gaveUp: false, since, now: since - 500 })).toBe("waking");
  });
});

describe("formatElapsed", () => {
  it("m:ss", () => {
    expect(formatElapsed(5_000)).toBe("0:05");
    expect(formatElapsed(5_999)).toBe("0:05");
    expect(formatElapsed(67_000)).toBe("1:07");
    expect(formatElapsed(600_000)).toBe("10:00");
  });
  it("negative or NaN is 0:00", () => {
    expect(formatElapsed(-1)).toBe("0:00");
    expect(formatElapsed(NaN)).toBe("0:00");
    expect(formatElapsed(Infinity)).toBe("0:00");
  });
});

describe("showWaitingForServer", () => {
  const now = 2_000_000;
  const waking = { state: "waking" as const, gaveUp: false, wokeAt: null };
  const recent = { state: "awake" as const, gaveUp: false, wokeAt: now - 3_000 };
  let release: (() => void) | null = null;
  afterEach(() => {
    release?.();
    release = null;
  });

  it("true while waking (not given up) for network and timeout", () => {
    expect(showWaitingForServer("network", waking, false, now)).toBe(true);
    expect(showWaitingForServer("timeout", waking, true, now)).toBe(true);
  });

  it("true for the refetch right after a wake (retrying, wokeAt < 15 s ago)", () => {
    expect(showWaitingForServer("network", recent, true, now)).toBe(true);
    expect(showWaitingForServer("timeout", { ...recent, wokeAt: now - 14_999 }, true, now)).toBe(true);
    expect(showWaitingForServer("timeout", { ...recent, wokeAt: now - 15_000 }, true, now)).toBe(false);
  });

  it("false for other failure kinds", () => {
    for (const kind of ["http", "forbidden", "api", "invalid_response", "aborted", "unauthorized"] as ApiFailureKind[]) {
      expect(showWaitingForServer(kind, waking, false, now)).toBe(false);
      expect(showWaitingForServer(kind, recent, true, now)).toBe(false);
    }
  });

  it("false while awake with no recent wake, or awake without retrying", () => {
    expect(showWaitingForServer("network", { state: "awake", gaveUp: false, wokeAt: null }, true, now)).toBe(false);
    expect(showWaitingForServer("network", { state: "awake", gaveUp: false, wokeAt: now - 60_000 }, true, now)).toBe(false);
    expect(showWaitingForServer("network", recent, false, now)).toBe(false);
  });

  it("false after the give-up", () => {
    expect(showWaitingForServer("timeout", { ...waking, gaveUp: true }, false, now)).toBe(false);
    expect(showWaitingForServer("timeout", { ...waking, gaveUp: true }, true, now)).toBe(false);
  });

  it("false while a demo transport is installed", () => {
    release = installApiTransport(async () => ({ status: 200, text: "" }));
    expect(showWaitingForServer("network", waking, false, now)).toBe(false);
    expect(showWaitingForServer("timeout", recent, true, now)).toBe(false);
  });
});
