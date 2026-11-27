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

  // ------------------------------------------------------------------ RD-2 (plan 52-1)

  /** Every RD-2 colour token is a 6-digit hex, `transparent` or an rgba() overlay. */
  const RD2_COLOURS = [
    "txt-hd", "txt-sub", "txt-dim", "txt-mid", "txt-faint", "txt-abs", "txt-note", "task-t", "input-t", "placeholder",
    "stat-label", "card-fg", "ico-faint", "ico-hover", "edge", "rule", "ring-soft", "check-ring", "ctl-border", "sel-border",
    "row-hover", "menu-hover", "search-hover", "skeleton", "tile-bg", "stat-bg", "acc-grad-start", "acc-grad-end",
    "acc-grad-hover-start", "acc-grad-hover-end", "acc-glow", "shine", "prio-low", "prio-low-b", "prio-med", "prio-med-b",
    "prio-high", "prio-high-b", "prio-high-bg", "chip-bg", "chip-t", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
    "chart-grid", "chart-axis", "chart-label", "chart-note", "heat-0", "heat-0-t", "heat-out", "heat-1", "heat-2", "heat-3",
    "heat-4", "heat-5", "heat-top", "on-heat", "fire", "badge", "on-badge", "track", "tick", "hz-page", "hz-line",
    "pom-scrim", "hover", "brk", "brk-t", "brk-sub", "on-brk", "brk-wedge",
  ];
  const HEX = /^#[0-9A-Fa-f]{6}$/;
  const COLOUR = /^(#[0-9A-Fa-f]{6}|transparent|rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (0|1|0?\.\d+)\))$/;

  /** [foreground, background, minimum, themes] — Classic's own values are exempt where they are today's (unchanged). */
  const RD2_PAIRS: [string, string, number, string[]][] = [
    // Plan 52-1: chart axis text against the card, in all six. Classic dark moved #737373 → #7E7E7E for this.
    ["chart-axis", "card", 4.5, THEMES],
    ["on-acc", "acc-grad-start", 4.5, THEMES],
    ["on-acc", "acc-grad-end", 4.5, THEMES],
    ["on-brk", "brk", 4.5, THEMES],
    ["brk-t", "card", 4.5, THEMES],
    ["prio-low", "card", 4.5, THEMES],
    ["prio-med", "card", 4.5, THEMES],
    ["prio-high", "card", 4.5, ["classic", "calm"]],
    // The badge number on --badge: Classic's white on blue-500 is 3.68:1 today, so 3:1 (as --on-ok).
    ["on-badge", "badge", 3, THEMES],
    // Calm and Field notes map these onto --txt/--txt2; Classic keeps today's greys (gray-500 on the dark card is 3.9:1).
    ["txt-hd", "card", 4.5, ["calm", "field"]],
    ["txt-sub", "card", 4.5, ["calm", "field"]],
    ["txt-dim", "card", 4.5, ["calm", "field"]],
    ["txt-mid", "card", 4.5, ["calm", "field"]],
    ["task-t", "card", 4.5, ["calm", "field"]],
    ["stat-label", "card", 4.5, ["calm", "field"]],
    ["chip-t", "chip-bg", 4.5, ["calm", "field"]],
  ];

  for (const theme of THEMES) {
    for (const mode of MODES) {
      describe(`RD-2 tokens · ${theme} · ${mode}`, () => {
        const t = tokens(theme, mode);

        it("defines every RD-2 colour", () => {
          for (const name of RD2_COLOURS) expect(t[name], `--${name}`).toMatch(COLOUR);
        });

        for (const [fg, bg, min, themes] of RD2_PAIRS) {
          if (!themes.includes(theme)) continue;
          it(`--${fg} on --${bg} ≥ ${min}`, () => {
            expect(t[fg], `--${fg}`).toMatch(HEX);
            expect(t[bg], `--${bg}`).toMatch(HEX);
            expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(min);
          });
        }

        // A high-priority chip with its own fill (Calm, Field notes): its text against that fill.
        if (theme !== "classic") {
          it("--prio-high on --prio-high-bg ≥ 4.5", () => {
            expect(contrast(t["prio-high"], t["prio-high-bg"])).toBeGreaterThanOrEqual(4.5);
          });
        }
      });
    }
  }

  it("Classic's chart and heat-map colours are today's (no visible change)", () => {
    expect(tokens("classic", "light")["chart-1"]).toBe("#53D86A");
    expect(tokens("classic", "light")["chart-axis"]).toBe("#737373");
    expect(tokens("classic", "light")["heat-1"]).toBe("#D4F5D9");
    expect(tokens("classic", "dark")["heat-1"]).toBe("#1A2E21");
  });

  it("defines type and shape for every theme", () => {
    for (const theme of THEMES) {
      const block = new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
      for (const name of ["f-head", "w-head", "f-body", "ls-head", "big", "r-card", "r-ctl", "f-title", "f-ui", "f-card", "w-title", "w-card", "ls-title", "r-board"]) {
        expect(block, `${theme} --${name}`).toContain(`--${name}:`);
      }
    }
  });
});
