import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createToastController } from "../toastController";
import type { ApiFailure } from "@/lib/apiClient";

const content = (title: string) => ({ title, description: "d", className: "c" });
const fail = (kind: ApiFailure["kind"]): ApiFailure => ({ ok: false, status: 500, kind, message: "server text" });

describe("toast controller", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows, starts the exit at 10 s and hides 400 ms later", () => {
    const t = createToastController();
    t.show(content("a"));
    expect(t.getSnapshot().toast?.title).toBe("a");
    vi.advanceTimersByTime(9_999);
    expect(t.getSnapshot().exiting).toBe(false);
    vi.advanceTimersByTime(1);
    expect(t.getSnapshot().exiting).toBe(true);
    vi.advanceTimersByTime(399);
    expect(t.getSnapshot().toast).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(t.getSnapshot().toast).toBeNull();
  });

  it("gives a second toast shown at 5 s its full 10 s", () => {
    const t = createToastController();
    t.show(content("a"));
    vi.advanceTimersByTime(5_000);
    t.show(content("b"));
    vi.advanceTimersByTime(5_000); // the first toast's timer would have fired here
    expect(t.getSnapshot().toast?.title).toBe("b");
    expect(t.getSnapshot().exiting).toBe(false);
    vi.advanceTimersByTime(5_000);
    expect(t.getSnapshot().exiting).toBe(true);
    vi.advanceTimersByTime(400);
    expect(t.getSnapshot().toast).toBeNull();
  });

  it("gives a toast shown during the previous toast's exit its full duration", () => {
    const t = createToastController();
    t.show(content("a"));
    vi.advanceTimersByTime(10_000); // exiting
    expect(t.getSnapshot().exiting).toBe(true);
    vi.advanceTimersByTime(200);
    t.show(content("b"));
    expect(t.getSnapshot().exiting).toBe(false);
    vi.advanceTimersByTime(200); // the old exit would have hidden it here
    expect(t.getSnapshot().toast?.title).toBe("b");
    vi.advanceTimersByTime(9_799);
    expect(t.getSnapshot().exiting).toBe(false);
    vi.advanceTimersByTime(1);
    expect(t.getSnapshot().exiting).toBe(true);
    vi.advanceTimersByTime(400);
    expect(t.getSnapshot().toast).toBeNull();
  });

  it("close() exits and hides after 400 ms", () => {
    const t = createToastController();
    t.show(content("a"));
    t.close();
    expect(t.getSnapshot().exiting).toBe(true);
    vi.advanceTimersByTime(399);
    expect(t.getSnapshot().toast).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(t.getSnapshot().toast).toBeNull();
    vi.advanceTimersByTime(20_000); // the cancelled display timer never fires
    expect(t.getSnapshot().toast).toBeNull();
  });

  it("close() with nothing showing does nothing", () => {
    const t = createToastController();
    const before = t.getSnapshot();
    t.close();
    expect(t.getSnapshot()).toBe(before);
  });

  it("honours a per-toast display time", () => {
    const t = createToastController();
    t.show(content("a"), { displayMs: 3_000 });
    vi.advanceTimersByTime(3_000);
    expect(t.getSnapshot().exiting).toBe(true);
  });

  it("dispose() fires no callbacks and empties the listener set", () => {
    const t = createToastController();
    const listener = vi.fn();
    t.subscribe(listener);
    t.show(content("a"));
    expect(listener).toHaveBeenCalledTimes(1);
    t.dispose();
    expect(t.listenerCount()).toBe(0);
    vi.advanceTimersByTime(20_000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("balances subscribe and unsubscribe", () => {
    const t = createToastController();
    const a = t.subscribe(() => {});
    const b = t.subscribe(() => {});
    expect(t.listenerCount()).toBe(2);
    a();
    a();
    expect(t.listenerCount()).toBe(1);
    b();
    expect(t.listenerCount()).toBe(0);
  });

  it("returns the same snapshot until something changes", () => {
    const t = createToastController();
    const first = t.getSnapshot();
    expect(t.getSnapshot()).toBe(first);
    t.show(content("a"));
    const second = t.getSnapshot();
    expect(second).not.toBe(first);
    expect(t.getSnapshot()).toBe(second);
  });

  it("keeps stable bound methods for useSyncExternalStore", () => {
    const t = createToastController();
    expect(t.subscribe).toBe(t.subscribe);
    expect(t.getSnapshot).toBe(t.getSnapshot);
  });

  it("success() prefers the backend message, else the fallback", () => {
    const t = createToastController();
    t.success("Task Created", "fallback", "from server");
    expect(t.getSnapshot().toast).toEqual({ title: "Task Created", description: "from server", className: "text-green-600" });
    t.success("Task Created", "fallback");
    expect(t.getSnapshot().toast?.description).toBe("fallback");
  });

  it("failure() shows fixed copy for user-facing kinds and nothing for aborted/unauthorized", () => {
    const t = createToastController();
    t.failure(fail("aborted"));
    t.failure(fail("unauthorized"));
    expect(t.getSnapshot().toast).toBeNull();
    t.failure(fail("network"));
    expect(t.getSnapshot().toast?.className).toBe("text-error-default");
  });

  it("unexpected() uses the error message or a fixed fallback", () => {
    const t = createToastController();
    t.unexpected(new Error("boom"));
    expect(t.getSnapshot().toast).toEqual({ title: "Something Went Wrong", description: "boom", className: "text-error-default" });
    t.unexpected("x");
    expect(t.getSnapshot().toast?.description).toBe("An unknown error occurred");
  });

  it("error() keeps the caller's copy", () => {
    const t = createToastController();
    t.error("Something Went Wrong", "status failed");
    expect(t.getSnapshot().toast).toEqual({ title: "Something Went Wrong", description: "status failed", className: "text-error-default" });
  });
});
