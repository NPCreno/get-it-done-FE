import { describe, expect, it } from "vitest";
import { dialNumbers, dialTicksPath, dialWedgePath, miniWedgePath } from "../geometry";
import {
  clock,
  faceLine,
  fractionDone,
  fractionLeft,
  kicker,
  miniCaption,
  nextHint,
  PAUSED_LINE,
  pct,
  pipsLabel,
} from "../faceCopy";

/** The arc's flags and end point from `M.. L.. A r r 0 large sweep x y Z`. */
function arc(d: string) {
  const m = /A80 80 0 ([01]) 1 ([\d.]+) ([\d.]+)Z$/.exec(d);
  if (!m) throw new Error(`no arc in ${d}`);
  return { large: Number(m[1]), x: Number(m[2]), y: Number(m[3]) };
}

/** Clockwise angle from twelve o'clock, in degrees, of a point on the dial. */
const angleOf = (x: number, y: number) => ((Math.atan2(x - 100, 100 - y) * 180) / Math.PI + 360) % 360;

describe("dialWedgePath (60-minute face, radius 80, centre 100)", () => {
  it("draws nothing at 0 (or below)", () => {
    expect(dialWedgePath(0)).toBe("");
    expect(dialWedgePath(-5)).toBe("");
  });

  it("25 minutes: a small arc ending at 150°", () => {
    const d = dialWedgePath(1500);
    expect(d.startsWith("M100 100L100 20")).toBe(true);
    const a = arc(d);
    expect(a.large).toBe(0);
    expect(angleOf(a.x, a.y)).toBeCloseTo(150, 1);
    expect(Math.hypot(a.x - 100, a.y - 100)).toBeCloseTo(80, 1);
  });

  it("40 minutes: the large-arc flag is set", () => {
    const a = arc(dialWedgePath(2400));
    expect(a.large).toBe(1);
    expect(angleOf(a.x, a.y)).toBeCloseTo(240, 1);
  });

  it("an hour or more is a full disc (two half arcs)", () => {
    const full = "M100 20A80 80 0 1 1 100 180A80 80 0 1 1 100 20Z";
    expect(dialWedgePath(3600)).toBe(full);
    expect(dialWedgePath(9999)).toBe(full);
  });

  it("the mini wedge is the same shape on a 34 px icon", () => {
    expect(miniWedgePath(0)).toBe("");
    expect(miniWedgePath(1500)).toMatch(/^M17 17L17 2A15 15 0 0 1 /);
  });
});

describe("dialTicksPath and numbers", () => {
  it("has 60 segments", () => {
    const d = dialTicksPath();
    expect(d.match(/M/g)).toHaveLength(60);
    expect(d.match(/L/g)).toHaveLength(60);
  });

  it("numbers 0–55 sit outside the ticks, matching the board", () => {
    const n = dialNumbers();
    expect(n.map((x) => x.label)).toEqual(["0", "5", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]);
    expect(n[0]).toEqual({ label: "0", x: 100, y: -6 });
    expect(n[3]).toEqual({ label: "15", x: 210, y: 104 });
  });
});

describe("ticket and horizon helpers", () => {
  it("fractionLeft is clamped to 0–1", () => {
    expect(fractionLeft(1500, 1500)).toBe(1);
    expect(fractionLeft(750, 1500)).toBe(0.5);
    expect(fractionLeft(0, 1500)).toBe(0);
    expect(fractionLeft(-10, 1500)).toBe(0);
    expect(fractionLeft(2000, 1500)).toBe(1);
    expect(fractionLeft(100, 0)).toBe(0);
    expect(fractionLeft(Number.NaN, 1500)).toBe(0);
    expect(fractionDone(375, 1500)).toBe(0.75);
  });

  it("pct is clamped and has one decimal", () => {
    expect(pct(0.748)).toBe("74.8%");
    expect(pct(2)).toBe("100.0%");
    expect(pct(-1)).toBe("0.0%");
  });

  it("nextHint: rounds 1–3 are followed by a short break, round 4 by a long one", () => {
    expect(nextHint(0)).toBe("Next: a 5-minute break");
    expect(nextHint(1)).toBe("Next: a 5-minute break");
    expect(nextHint(2)).toBe("Next: a 5-minute break");
    expect(nextHint(3)).toBe("Next: a long break");
    expect(nextHint(4)).toBe("Next: a long break");
  });

  it("nextHint during breaks", () => {
    expect(nextHint(2, "shortBreak")).toBe("Next: focus round 3");
    expect(nextHint(4, "shortBreak")).toBe("Next: focus round 4");
    expect(nextHint(4, "longBreak")).toBe("Then the cycle starts again");
  });

  it("kicker and pips", () => {
    expect(kicker("running", "pomodoro", 1, true)).toBe("Focus · round 2");
    expect(kicker("running", "pomodoro", 1, false)).toBe("Focus");
    expect(kicker("running", "pomodoro", 4, true)).toBe("Focus");
    expect(kicker("paused", "pomodoro", 1, true)).toBe("Focus · paused");
    expect(kicker("idle", "shortBreak", 1, true)).toBe("Short break");
    expect(kicker("paused", "longBreak", 1, true)).toBe("Long break");
    expect(pipsLabel(2)).toBe("2 of 4 focus rounds done");
  });

  it("one line per situation, no emoji", () => {
    expect(faceLine("running", "pomodoro")).toBe("Focus on one thing.");
    expect(faceLine("idle", "shortBreak")).toBe("Step away from the screen.");
    expect(faceLine("running", "longBreak")).toBe("Time for a longer break. Get some air.");
    expect(faceLine("paused", "shortBreak")).toBe(PAUSED_LINE);
    expect(PAUSED_LINE).toBe("Paused. Pick it up when you’re ready.");
  });

  it("clock is m:ss and never negative", () => {
    expect(clock(1500)).toBe("25:00");
    expect(clock(190)).toBe("3:10");
    expect(clock(-3)).toBe("0:00");
  });

  it("mini captions", () => {
    expect(miniCaption("ticket", "idle", "pomodoro", 1)).toBe("Start");
    expect(miniCaption("ticket", "running", "pomodoro", 1)).toBe("2 of 4");
    expect(miniCaption("ticket", "running", "pomodoro", 4)).toBe("4 of 4");
    expect(miniCaption("ticket", "paused", "pomodoro", 1)).toBe("Paused");
    expect(miniCaption("ticket", "running", "shortBreak", 1)).toBe("Break");
    expect(miniCaption("horizon", "running", "pomodoro", 1)).toBe("Focus");
  });
});
