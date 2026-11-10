import { describe, expect, it } from "vitest";
import { BUCKET_MS, DAY_MS, bucketOf, msUntilNextBucket, windowFor } from "../window";

const ms = (iso: string) => Date.parse(iso);

/** Fake server filters replicating the BE where-clauses (plan section 0.4). */
const userShows = (due: number | null, end: number) => due === null || due <= end; // NULL | BETWEEN | < start
const projShows = (due: number | null, start: number, end: number) => due === null || (due >= start && due <= end);

/** What today's callers send: [now, now + 24h]. */
const today = (now: number) => ({ start: now, end: now + DAY_MS });

const BASE = Date.parse("2026-11-10T10:00:00.000Z"); // a bucket boundary
const w = (now: number) => {
  const x = windowFor(now);
  return { start: ms(x.start), end: ms(x.end) };
};

describe("windowFor", () => {
  it("is [bucketStart, bucketStart + 24h + 5min] in ISO UTC", () => {
    const x = windowFor(BASE + 3 * 60_000);
    expect(x.start).toBe("2026-11-10T10:00:00.000Z");
    expect(x.end).toBe("2026-11-11T10:05:00.000Z");
  });

  it("is stable within a bucket and changes exactly at the boundary", () => {
    expect(windowFor(BASE)).toEqual(windowFor(BASE + BUCKET_MS - 1));
    expect(windowFor(BASE + BUCKET_MS)).not.toEqual(windowFor(BASE + BUCKET_MS - 1));
    expect(windowFor(BASE + BUCKET_MS).start).toBe("2026-11-10T10:05:00.000Z");
  });

  it("does not depend on the timezone (pure epoch arithmetic)", () => {
    expect(ms(windowFor(BASE).start) % BUCKET_MS).toBe(0);
  });
});

describe("msUntilNextBucket", () => {
  it("is a full bucket on a boundary, 1 ms one millisecond before, and lands on the next boundary", () => {
    expect(msUntilNextBucket(BASE)).toBe(BUCKET_MS);
    expect(msUntilNextBucket(BASE + BUCKET_MS - 1)).toBe(1);
    for (const now of [BASE + 1, BASE + 12_345, BASE + 299_999]) {
      expect(bucketOf(now + msUntilNextBucket(now))).toBe(bucketOf(now) + 1);
      expect((now + msUntilNextBucket(now)) % BUCKET_MS).toBe(0);
    }
  });
});

describe("window boundaries against the fake server filters", () => {
  it("now exactly on a bucket boundary, and 1 ms before one", () => {
    for (const now of [BASE, BASE + BUCKET_MS - 1]) {
      const win = w(now);
      expect(win.start).toBeLessThanOrEqual(now);
      expect(win.end).toBeGreaterThanOrEqual(now + DAY_MS);
      expect(win.end - win.start).toBe(DAY_MS + BUCKET_MS);
    }
  });

  it("a task due exactly at now + 24h is shown, as today", () => {
    const now = BASE + 3 * 60_000;
    expect(userShows(now + DAY_MS, w(now).end)).toBe(true);
    expect(projShows(now + DAY_MS, w(now).start, w(now).end)).toBe(true);
  });

  it("a task due exactly at window.end is shown (accepted tolerance); window.end + 1 ms is hidden", () => {
    const now = BASE + 3 * 60_000;
    const { start, end } = w(now);
    expect(userShows(end, end)).toBe(true);
    expect(userShows(end + 1, end)).toBe(false);
    expect(projShows(end, start, end)).toBe(true);
    expect(projShows(end + 1, start, end)).toBe(false);
  });

  it("project tasks: due exactly at window.start shown, start - 1 ms hidden, now - 1 ms shown (accepted tolerance)", () => {
    const now = BASE + 3 * 60_000;
    const { start, end } = w(now);
    expect(projShows(start, start, end)).toBe(true);
    expect(projShows(start - 1, start, end)).toBe(false);
    // Today's window would hide a task due 1 ms ago; the quantized one shows it.
    expect(projShows(now - 1, today(now).start, today(now).end)).toBe(false);
    expect(projShows(now - 1, start, end)).toBe(true);
  });

  it("undated tasks are always shown", () => {
    const { start, end } = w(BASE);
    expect(userShows(null, end)).toBe(true);
    expect(projShows(null, start, end)).toBe(true);
  });

  it("property: every task today's code shows is still shown (1,000 random instants)", () => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 1000; i++) {
      const now = BASE + Math.floor(rand() * 30 * DAY_MS);
      const win = w(now);
      const t = today(now);
      expect(win.start).toBeLessThanOrEqual(t.start);
      expect(win.start).toBeGreaterThan(t.start - BUCKET_MS - 1);
      expect(win.end).toBeGreaterThanOrEqual(t.end);
      expect(win.end).toBeLessThanOrEqual(t.end + BUCKET_MS);
      for (let k = 0; k < 8; k++) {
        const due = k === 0 ? null : now + Math.floor((rand() - 0.5) * 4 * DAY_MS);
        if (userShows(due, t.end)) expect(userShows(due, win.end)).toBe(true);
        if (projShows(due, t.start, t.end)) expect(projShows(due, win.start, win.end)).toBe(true);
      }
    }
  });
});
