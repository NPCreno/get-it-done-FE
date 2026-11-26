import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * RD-1 §1: every token pair passes WCAG contrast in all six theme × mode combinations.
 * Parses src/styles/theme-tokens.css itself, so a changed value is checked the moment it lands.
 */
const css = readFileSync(join(process.cwd(), "src/styles/theme-tokens.css"), "utf8");

function tokens(theme: string, mode: string): Record<string, string> {
  const re = new RegExp(`\\[data-theme="${theme}"\\]\\[data-mode="${mode}"\\]\\s*\\{([^}]*)\\}`);
  const block = re.exec(css)?.[1];
  if (!block) throw new Error(`no block for ${theme}/${mode}`);
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const THEMES = ["classic", "calm", "field"];
const MODES = ["light", "dark"];
const COLOURS = ["page", "card", "line", "strong", "txt", "txt2", "acc", "acc-t", "acc-sub", "on-acc", "ok", "on-ok", "hi", "on-hi", "focus", "bar-now", "scrim"];

/** [foreground, background, minimum] */
const PAIRS: [string, string, number][] = [
  ["txt", "page", 4.5],
  ["txt", "card", 4.5],
  ["txt2", "page", 4.5],
  ["txt2", "card", 4.5],
  ["on-acc", "acc", 4.5],
  ["acc-t", "card", 4.5],
  ["focus", "page", 3],
  ["on-hi", "hi", 4.5],
  // Check marks on --ok are graphics (WCAG 1.4.11): 3:1. Classic/Calm light are 4.35:1, so never small text.
  ["on-ok", "ok", 3],
];

describe("theme token contrast", () => {
  it("helper matches known WCAG values", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrast("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
  });

  for (const theme of THEMES) {
    for (const mode of MODES) {
      describe(`${theme} · ${mode}`, () => {
        const t = tokens(theme, mode);

        it("defines every colour as a 6-digit hex", () => {
          for (const name of COLOURS) expect(t[name], `--${name}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });

        for (const [fg, bg, min] of PAIRS) {
          it(`--${fg} on --${bg} ≥ ${min}`, () => {
            expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(min);
          });
        }
      });
    }
  }

  it("defines type and shape for every theme", () => {
    for (const theme of THEMES) {
      const block = new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
      for (const name of ["f-head", "w-head", "f-body", "ls-head", "big", "r-card", "r-ctl"]) {
        expect(block, `${theme} --${name}`).toContain(`--${name}:`);
      }
    }
  });
});
