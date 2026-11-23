import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAIN_LAYOUT_ROOT_CLASS, MAIN_LAYOUT_SCROLL_CLASS } from "../mainLayoutClasses";

/**
 * BUG-06: `sr-only` is `position: absolute`. Without a positioned ancestor, a hidden caption far
 * down MainLayout's scroll content stretched the document past the `h-screen` layout, so the
 * window scrolled 301 px further than the app and showed a blank band on /profileSettings.
 * Do not remove `relative` from these boxes.
 */
const classes = (s: string) => s.split(/\s+/).filter(Boolean);

describe("BUG-06: MainLayout keeps absolute children inside its boxes", () => {
  it("the scroll container is relative and still scrolls", () => {
    expect(classes(MAIN_LAYOUT_SCROLL_CLASS)).toEqual(
      expect.arrayContaining(["relative", "h-full", "overflow-y-auto", "overflow-x-hidden"]),
    );
  });

  it("the root is relative, one screen tall and clips", () => {
    expect(classes(MAIN_LAYOUT_ROOT_CLASS)).toEqual(
      expect.arrayContaining(["relative", "h-screen", "overflow-hidden"]),
    );
  });

  it("MainLayout uses these constants rather than inline class strings", () => {
    const src = readFileSync(join(__dirname, "..", "MainLayout.tsx"), "utf8");
    expect(src).toContain("className={MAIN_LAYOUT_SCROLL_CLASS}");
    expect(src).toContain("${MAIN_LAYOUT_ROOT_CLASS}");
    expect(src).not.toMatch(/className="[^"]*overflow-y-auto overflow-x-hidden/);
  });

  it("a horizontal scroller with sr-only children is relative too (the token table on a phone)", () => {
    // Otherwise its `sr-only` children widen MainLayout's scroll box, and a click shifts the page sideways.
    const src = readFileSync(join(__dirname, "..", "apiTokens", "ApiTokensSection.tsx"), "utf8");
    expect(src).toMatch(/className="relative overflow-x-auto">\s*<table/);
  });
});
