import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createPresence, PAGE_IN_MAX_MS } from "@/hooks/presence";
import {
  STAT_CARD_DURATION_S,
  STAT_CARD_STAGGER_S,
  STAT_VALUE_DELAY_S,
  STAT_VALUE_TRANSITION,
  statCardTransition,
} from "../statsCardMotion";

/**
 * UX-05 (2026-11-25): page entrances, modal pops, the loader hand-off and navigation chrome were
 * halved at the user's request. These tests stop a later edit from silently bringing back the
 * slow staggers (the old `fade-in-delay-4` settled 1.3 s after navigation).
 */
const read = (rel: string) => readFileSync(path.resolve(__dirname, "../../../..", rel), "utf8");
const css = read("src/app/globals.css");

/** The declarations of one top-level rule, whitespace-collapsed. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`no rule ${selector} in globals.css`);
  return m[1].replace(/\s+/g, " ").trim();
}

describe("UX-05: globals.css page entrance timings (§1a)", () => {
  it.each([
    [".fade-in", "animation: fadeIn 0.2s ease-out;"],
    [".fade-in-delay-0", "animation: fadeIn 0.2s ease-out 0s both;"],
    [".fade-in-delay-1", "animation: fadeIn 0.2s ease-out 0.1s both;"],
    [".fade-in-delay-2", "animation: fadeIn 0.25s ease-out 0.2s both;"],
    [".fade-in-delay-3", "animation: fadeIn 0.3s ease-out 0.25s both;"],
    [".fade-in-delay-4", "animation: fadeIn 0.35s ease-out 0.3s both;"],
    [".fade-in-left", "animation: fadeInLeft 0.25s ease-out both;"],
    [".fade-in-left-delay-1", "animation-delay: 0.05s;"],
    [".fade-in-left-delay-2", "animation-delay: 0.15s;"],
    [".fade-in-left-delay-3", "animation-delay: 0.2s;"],
    [".fade-in-left-delay-4", "animation-delay: 0.25s;"],
  ])("%s", (selector, declaration) => {
    expect(rule(selector)).toBe(declaration);
  });

  it("the modal pop is 0.075 s (§1d)", () => {
    expect(rule(".modal-popup")).toBe("animation: fadePop 0.075s ease-out;");
  });

  it("no page entrance or pop runs past the UX-05 ceilings (0.35 s, 0.3 s delay, 0.1 s pop)", () => {
    const seconds = (s: string) => [...s.matchAll(/(\d*\.?\d+)s\b/g)].map((m) => Number(m[1]));
    for (const sel of [".fade-in", ".fade-in-delay-0", ".fade-in-delay-1", ".fade-in-delay-2", ".fade-in-delay-3", ".fade-in-delay-4", ".fade-in-left"]) {
      const [duration, delay = 0] = seconds(rule(sel));
      expect(duration, sel).toBeLessThanOrEqual(0.35);
      expect(delay, sel).toBeLessThanOrEqual(0.3);
    }
    expect(seconds(rule(".modal-popup"))[0]).toBeLessThanOrEqual(0.1);
  });
});

describe("UX-05: dashboard stat card framer timings (§1b)", () => {
  it("card 0.25 s, stagger index × 0.05 s, value delay 0.1 s", () => {
    expect(STAT_CARD_DURATION_S).toBe(0.25);
    expect(STAT_CARD_STAGGER_S).toBe(0.05);
    expect(STAT_VALUE_DELAY_S).toBe(0.1);
    expect(STAT_VALUE_TRANSITION).toEqual({ delay: 0.1 });
  });

  it("reads the card index from the delay class", () => {
    expect(statCardTransition("fade-in-left-delay-1")).toEqual({ duration: 0.25, delay: 0.05 });
    expect(statCardTransition("fade-in-left-delay-4")).toEqual({ duration: 0.25, delay: 0.2 });
  });

  it("statsCard.tsx uses the helper, not inline timings", () => {
    const src = read("src/app/components/statsCard.tsx");
    expect(src).toContain("transition={statCardTransition(delay)}");
    expect(src).toContain("transition={STAT_VALUE_TRANSITION}");
    expect(src).not.toMatch(/duration: 0\.5|delay: 0\.2/);
  });
});

describe("UX-05: loader hand-off hooks (§1c)", () => {
  it("the presence exit defaults to 100 ms", () => {
    const delays: number[] = [];
    const p = createPresence({
      show: true,
      setTimeout: (_cb, ms) => {
        delays.push(ms);
        return 1;
      },
      clearTimeout: () => {},
    });
    p.set(false);
    expect(delays).toEqual([100]);
  });

  it("usePresence defaults to 100 ms too", () => {
    expect(read("src/hooks/usePresence.ts")).toContain("exitMs = 100)");
  });

  it("the page-in fallback is 200 ms", () => {
    expect(PAGE_IN_MAX_MS).toBe(200);
  });
});

describe("UX-05: modal and navigation chrome (§1d)", () => {
  it.each([
    ["src/app/components/modals/confirmation.tsx", "duration-100", "duration-200"],
    ["src/app/components/MobileSidebar.tsx", "duration-150", "duration-300"],
    ["src/app/components/Sidebar.tsx", "duration-150", "duration-300"],
    ["src/app/components/MainLayout.tsx", "duration-150", "duration-300"],
    ["src/app/components/HamburgerButton.tsx", "duration-150", "duration-300"],
  ])("%s uses %s, not %s", (file, now, before) => {
    const src = read(file);
    expect(src).toContain(now);
    expect(src).not.toContain(before);
  });
});
