import { describe, expect, it } from "vitest";
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

describe("the one-time 'New: pick a look' card (plan 53b §4)", () => {
  it("shows once per device: the first turn shows it and remembers; the next turn doesn't", () => {
    const s = fakeStorage();
    expect(takeNewLooksTurn(s, false)).toBe(true);
    expect(s.data[NEW_LOOKS_KEY]).toBe("1");
    expect(takeNewLooksTurn(s, false)).toBe(false);
  });

  it("a dismissal (either button) is for good", () => {
    const s = fakeStorage();
    expect(shouldShowNewLooks(s, false)).toBe(true);
    markNewLooksSeen(s);
    expect(shouldShowNewLooks(s, false)).toBe(false);
  });

  it("never in /demo, and /demo doesn't use up the turn", () => {
    const s = fakeStorage();
    expect(takeNewLooksTurn(s, true)).toBe(false);
    expect(s.data[NEW_LOOKS_KEY]).toBeUndefined();
    expect(takeNewLooksTurn(s, false)).toBe(true);
  });

  it("no storage, or storage that throws, never shows it and never throws", () => {
    expect(takeNewLooksTurn(null, false)).toBe(false);
    expect(() => takeNewLooksTurn(throwing, false)).not.toThrow();
    expect(takeNewLooksTurn(throwing, false)).toBe(false);
    expect(() => markNewLooksSeen(throwing)).not.toThrow();
  });

  it("the dashboard page mounts the card; /demo's body never does", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
    expect(read("src/app/(routes)/dashboard/page.tsx")).toContain("notice={<NewLooksCard />}");
    expect(read("src/app/components/dashboard/DashboardView.tsx")).not.toContain("NewLooksCard");
    expect(read("src/app/demo/DemoBody.tsx")).not.toContain("NewLooksCard");
  });
});
