import { describe, expect, it } from "vitest";
import { ENABLED_THEMES } from "../appearance";
import { NEW_LOOKS_KEY, markNewLooksSeen, shouldShowNewLooks, takeNewLooksTurn, type NewLooksStorage } from "../newLooks";

function fakeStorage(initial: Record<string, string> = {}): NewLooksStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => void (data[k] = v) };
}
const throwing: NewLooksStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};
/** Three themes enabled: the case the card is for (after plan 54). */
const ALL = 3;

describe("the one-time 'New: pick a look' card (plan 53b §4)", () => {
  it("shows once per device: the first turn shows it and remembers; the next turn doesn't", () => {
    const s = fakeStorage();
    expect(takeNewLooksTurn(s, false, ALL)).toBe(true);
    expect(s.data[NEW_LOOKS_KEY]).toBe("1");
    expect(takeNewLooksTurn(s, false, ALL)).toBe(false);
  });

  it("a dismissal (either button) is for good", () => {
    const s = fakeStorage();
    expect(shouldShowNewLooks(s, false, ALL)).toBe(true);
    markNewLooksSeen(s);
    expect(shouldShowNewLooks(s, false, ALL)).toBe(false);
  });

  it("never in /demo, and /demo doesn't use up the turn", () => {
    const s = fakeStorage();
    expect(takeNewLooksTurn(s, true, ALL)).toBe(false);
    expect(s.data[NEW_LOOKS_KEY]).toBeUndefined();
    expect(takeNewLooksTurn(s, false, ALL)).toBe(true);
  });

  it("never while fewer than two themes are enabled, and that doesn't use up the turn", () => {
    const s = fakeStorage();
    expect(takeNewLooksTurn(s, false, 1)).toBe(false);
    expect(takeNewLooksTurn(s, false, 0)).toBe(false);
    expect(s.data[NEW_LOOKS_KEY]).toBeUndefined();
    expect(takeNewLooksTurn(s, false, 2)).toBe(true);
  });

  it("today (Classic only, until plan 54) the card never shows", () => {
    expect(ENABLED_THEMES.length).toBe(1);
    expect(takeNewLooksTurn(fakeStorage(), false, ENABLED_THEMES.length)).toBe(false);
  });

  it("no storage, or storage that throws, never shows it and never throws", () => {
    expect(takeNewLooksTurn(null, false, ALL)).toBe(false);
    expect(() => takeNewLooksTurn(throwing, false, ALL)).not.toThrow();
    expect(takeNewLooksTurn(throwing, false, ALL)).toBe(false);
    expect(() => markNewLooksSeen(throwing)).not.toThrow();
  });

  it("the dashboard page mounts the card gated on ENABLED_THEMES; /demo's body never does", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
    expect(read("src/app/(routes)/dashboard/page.tsx")).toContain("notice={<NewLooksCard />}");
    expect(read("src/app/components/appearance/NewLooksCard.tsx")).toContain("takeNewLooksTurn(browserStorage(), demo, ENABLED_THEMES.length)");
    expect(read("src/app/components/dashboard/DashboardView.tsx")).not.toContain("NewLooksCard");
    expect(read("src/app/demo/DemoBody.tsx")).not.toContain("NewLooksCard");
  });
});
