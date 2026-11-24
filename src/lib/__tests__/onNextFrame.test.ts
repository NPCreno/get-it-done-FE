import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onNextFrame } from "../useTicker";

let frames: Array<() => void> = [];
beforeEach(() => {
  vi.useFakeTimers();
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (cb: () => void) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("onNextFrame (UX-03 banner open)", () => {
  it("runs once on the next frame", () => {
    const cb = vi.fn();
    onNextFrame(cb);
    frames.forEach((f) => f());
    vi.advanceTimersByTime(1_000);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("still runs when frames are paused (hidden tab)", () => {
    const cb = vi.fn();
    onNextFrame(cb, 100);
    vi.advanceTimersByTime(99);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
    frames.forEach((f) => f());
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("cancel stops both", () => {
    const cb = vi.fn();
    const cancel = onNextFrame(cb);
    cancel();
    frames.forEach((f) => f());
    vi.advanceTimersByTime(1_000);
    expect(cb).not.toHaveBeenCalled();
  });
});
