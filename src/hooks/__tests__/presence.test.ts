import { describe, expect, it } from "vitest";
import { createPresence, nextFirstLoad, nextPageIn } from "../presence";

/** A manual clock: timers run only when `advance` passes their time. */
function fakeTimers() {
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, { at: number; cb: () => void }>();
  return {
    setTimeout: (cb: () => void, ms: number) => {
      const id = nextId++;
      timers.set(id, { at: now + ms, cb });
      return id;
    },
    clearTimeout: (id: unknown) => {
      timers.delete(id as number);
    },
    advance(ms: number) {
      now += ms;
      for (const [id, t] of [...timers]) {
        if (t.at <= now) {
          timers.delete(id);
          t.cb();
        }
      }
    },
    pending: () => timers.size,
  };
}

describe("createPresence", () => {
  it("show → mounted, not leaving", () => {
    const p = createPresence({ show: false });
    expect(p.getSnapshot()).toEqual({ mounted: false, leaving: false });
    p.set(true);
    expect(p.getSnapshot()).toEqual({ mounted: true, leaving: false });
    expect(createPresence({ show: true }).getSnapshot()).toEqual({ mounted: true, leaving: false });
  });

  it("hide → leaving, then unmounted after exitMs", () => {
    const t = fakeTimers();
    const p = createPresence({ show: true, exitMs: 200, ...t });
    let calls = 0;
    p.subscribe(() => calls++);
    p.set(false);
    expect(p.getSnapshot()).toEqual({ mounted: true, leaving: true });
    t.advance(199);
    expect(p.getSnapshot()).toEqual({ mounted: true, leaving: true });
    t.advance(1);
    expect(p.getSnapshot()).toEqual({ mounted: false, leaving: false });
    expect(calls).toBe(2);
  });

  it("a second hide during the exit keeps the first timer", () => {
    const t = fakeTimers();
    const p = createPresence({ show: true, exitMs: 200, ...t });
    p.set(false);
    t.advance(150);
    p.set(false);
    t.advance(50);
    expect(p.getSnapshot().mounted).toBe(false);
  });

  it("hiding something not mounted does nothing", () => {
    const t = fakeTimers();
    const p = createPresence({ show: false, ...t });
    const before = p.getSnapshot();
    p.set(false);
    expect(p.getSnapshot()).toBe(before);
    expect(t.pending()).toBe(0);
  });

  it("show again during the exit cancels it", () => {
    const t = fakeTimers();
    const p = createPresence({ show: true, exitMs: 200, ...t });
    p.set(false);
    t.advance(100);
    p.set(true);
    expect(p.getSnapshot()).toEqual({ mounted: true, leaving: false });
    expect(t.pending()).toBe(0);
    t.advance(500);
    expect(p.getSnapshot()).toEqual({ mounted: true, leaving: false });
  });

  it("the snapshot keeps its identity when nothing changes", () => {
    const p = createPresence({ show: true });
    const s = p.getSnapshot();
    p.set(true);
    expect(p.getSnapshot()).toBe(s);
  });

  it("dispose clears the timers", () => {
    const t = fakeTimers();
    const p = createPresence({ show: true, exitMs: 200, ...t });
    p.set(false);
    expect(t.pending()).toBe(1);
    p.dispose();
    expect(t.pending()).toBe(0);
    p.dispose(); // safe twice
  });

  it("hiding again after a dispose (React's dev remount) restarts the exit", () => {
    const t = fakeTimers();
    const p = createPresence({ show: true, exitMs: 200, ...t });
    p.set(false);
    p.dispose();
    p.set(false);
    t.advance(200);
    expect(p.getSnapshot()).toEqual({ mounted: false, leaving: false });
  });
});

describe("useFirstLoad core (nextFirstLoad)", () => {
  const run = (values: boolean[]) => {
    let first = values[0];
    return values.map((v) => (first = nextFirstLoad(first, v)));
  };

  it("is true while loading", () => {
    expect(run([true, true, true])).toEqual([true, true, true]);
  });

  it("is false after the first non-loading value", () => {
    expect(run([true, true, false])).toEqual([true, true, false]);
  });

  it("stays false when loading turns true again", () => {
    expect(run([true, false, true, true])).toEqual([true, false, false, false]);
  });

  it("starts false when the data is already there (cached navigation)", () => {
    expect(run([false, true])).toEqual([false, false]);
  });
});

describe("page-in core (nextPageIn)", () => {
  it("starts only when the loader leaves", () => {
    expect(nextPageIn("idle", false)).toBe("idle");
    expect(nextPageIn("idle", true)).toBe("running");
  });

  it("runs once per visit", () => {
    expect(nextPageIn("running", true)).toBe("running");
    expect(nextPageIn("done", true)).toBe("done");
    expect(nextPageIn("done", false)).toBe("done");
  });
});
