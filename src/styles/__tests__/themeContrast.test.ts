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
    // Plan 52-2: projects and chat
    "txt-strong", "txt-body", "done-ink", "sep", "modal-edge", "row-edge", "row-bg", "field-bg", "ico-x", "overlay",
    "line-acc", "btn2-t", "btn2-t-alt", "btn2-hover", "ghost-b", "ghost-t", "acc-ink", "acc-soft", "acc-grad2-start",
    "acc-grad2-end", "pend-dot", "done-dot", "done-chip-bg", "done-chip-t", "date-chip-bg", "date-chip-t", "date-chip-b",
    "vprio-low-bg", "vprio-low-t", "vprio-med-bg", "vprio-med-t", "vprio-high-bg", "vprio-high-t", "bubble-me",
    "bubble-me-ink", "bubble-other", "bubble-other-ink", "ico-edit", "ico-edit-h",
    // Plan 52-3: profile, notifications, modals, shared controls
    "wait-bar", "sw-on", "sw-off", "sw-knob", "toast-bg", "toast-t", "toast-note", "dlg-note", "ico-date", "ico-close",
    "ico-check", "dot-low", "dot-med", "dot-high", "dot-done", "ok-t", "err-t", "ncard-bg", "ncard-t", "ncard-t2", "code-bg", "acc-t-light",
  ];
  const HEX = /^#[0-9A-Fa-f]{6}$/;
  const COLOUR = /^(#[0-9A-Fa-f]{6}|transparent|rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (0|1|0?\.\d+)\))$/;

  /**
   * [foreground, background, minimum] in all six themes. No exemptions (plan 52-3 §6): Classic's failures were fixed.
   * Text is 4.5:1; icons and other graphics are 3:1 (WCAG 1.4.11). A translucent background is composited over --card.
   */
  const RD2_PAIRS: [string, string, number][] = [
    ["chart-axis", "card", 4.5],
    ["on-acc", "acc-grad-start", 4.5],
    ["on-acc", "acc-grad-end", 4.5],
    ["on-brk", "brk", 4.5],
    ["brk-t", "card", 4.5],
    ["prio-low", "card", 4.5],
    ["prio-med", "card", 4.5],
    // A high-priority chip's text on its own fill (Calm, Field notes), or on the card where it has none (Classic).
    ["prio-high", "prio-high-bg", 4.5],
    ["on-badge", "badge", 4.5],
    ["txt-hd", "card", 4.5],
    ["txt-sub", "card", 4.5],
    ["txt-dim", "card", 4.5],
    ["txt-mid", "card", 4.5],
    ["task-t", "card", 4.5],
    ["stat-label", "card", 4.5],
    ["chip-t", "chip-bg", 4.5],
    ["bubble-me-ink", "bubble-me", 4.5],
    ["bubble-other-ink", "bubble-other", 4.5],
    ["on-acc", "acc-soft", 4.5],
    ["on-acc", "acc-grad2-end", 4.5],
    ["on-acc", "acc-grad2-start", 4.5],
    ["txt-strong", "card", 4.5],
    ["txt-body", "card", 4.5],
    ["ghost-t", "card", 4.5],
    ["ico-x", "card", 3],
    ["done-ink", "card", 4.5],
    ["btn2-t", "card", 4.5],
    ["btn2-t-alt", "card", 4.5],
    ["acc-ink", "card", 4.5],
    ["ico-edit", "card", 3],
    ["vprio-low-t", "vprio-low-bg", 4.5],
    ["vprio-med-t", "vprio-med-bg", 4.5],
    ["vprio-high-t", "vprio-high-bg", 4.5],
    ["done-chip-t", "done-chip-bg", 4.5],
    ["date-chip-t", "date-chip-bg", 4.5],
    // Plan 52-3
    ["acc-t", "acc-sub", 4.5],
    ["toast-t", "toast-bg", 4.5],
    ["toast-note", "toast-bg", 4.5],
    ["dlg-note", "card", 4.5],
    ["ncard-t", "ncard-bg", 4.5],
    ["ncard-t2", "ncard-bg", 4.5],
    ["acc-t-light", "ncard-bg", 4.5],
    ["ok-t", "card", 4.5],
    ["err-t", "card", 4.5],
    ["ico-date", "card", 3],
    ["ico-close", "card", 3],
    ["ico-check", "card", 3],
  ];
  // Not checked: the project-view status dots (--pend-dot, --done-dot) are decorative; a task's status is also
  // shown by the strike-through and named by its checkbox, so WCAG 1.4.11 does not apply to them.

  /** An rgba() or transparent background, composited over the card it sits on. */
  function solid(colour: string, card: string): string {
    if (HEX.test(colour)) return colour;
    const [r, g, b, a] = colour === "transparent" ? [0, 0, 0, 0] : (/rgba\(([^)]+)\)/.exec(colour)?.[1] ?? "").split(",").map(Number);
    const base = [1, 3, 5].map((i) => parseInt(card.slice(i, i + 2), 16));
    return "#" + [r, g, b].map((c, i) => Math.round(c * a + base[i] * (1 - a)).toString(16).padStart(2, "0")).join("");
  }

  for (const theme of THEMES) {
    for (const mode of MODES) {
      describe(`RD-2 tokens · ${theme} · ${mode}`, () => {
        const t = tokens(theme, mode);

        it("defines every RD-2 colour", () => {
          for (const name of RD2_COLOURS) expect(t[name], `--${name}`).toMatch(COLOUR);
        });

        for (const [fg, bg, min] of RD2_PAIRS) {
          it(`--${fg} on --${bg} ≥ ${min}`, () => {
            expect(t[fg], `--${fg}`).toMatch(HEX);
            expect(t[bg], `--${bg}`).toMatch(COLOUR);
            expect(contrast(t[fg], solid(t[bg], t.card))).toBeGreaterThanOrEqual(min);
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

  it("Classic's projects and chat colours are today's, except the own-bubble text (plan 52-2)", () => {
    const light = tokens("classic", "light");
    const dark = tokens("classic", "dark");
    expect([light["bubble-me"], light["bubble-other"], light["bubble-other-ink"]]).toEqual(["#FEAD03", "#F3F4F6", "#333333"]);
    expect([dark["bubble-me"], dark["bubble-other"], dark["bubble-other-ink"]]).toEqual(["#FEAD03", "#1F2937", "#FFFFFF"]);
    // The one intended change: white on amber (1.9:1) → #333 on amber, as every primary button label.
    expect(light["bubble-me-ink"]).toBe("#333333");
    expect(dark["bubble-me-ink"]).toBe("#333333");
    expect([light["txt-note"], dark["txt-note"]]).toEqual(["#676767", "#D1D5DB"]);
    expect([light["row-edge"], dark["row-edge"], dark["row-bg"]]).toEqual(["#E0E0E0", "#374151", "rgba(31, 41, 55, 0.5)"]);
  });

  it("Classic's approved contrast fixes (plan 52-3 §6) hold their values", () => {
    const light = tokens("classic", "light");
    const dark = tokens("classic", "dark");
    expect([light["done-ink"], light["btn2-t"], light["acc-ink"], light["chip-t"]]).toEqual(["#767676", "#7F5601", "#7F5601", "#7F5601"]);
    expect([light["vprio-low-t"], light["vprio-med-t"], light["vprio-high-t"]]).toEqual(["#13596A", "#894114", "#8A211F"]);
    expect([dark["acc-grad2-start"], dark["acc-grad2-end"]]).toEqual(["#E98006", "#EAB308"]);
    // Amber stays amber in dark, where it passes on the dark card.
    expect([dark["btn2-t"], dark["acc-t"]]).toEqual(["#E5E7EB", "#FEAD03"]);
  });

  it("shadcn variables are HSL triplets in every theme; Classic keeps today's :root values in both modes", () => {
    const TRIPLET = /^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/;
    for (const theme of THEMES) for (const mode of MODES) {
      const t = tokens(theme, mode);
      for (const n of ["background", "foreground", "popover", "primary", "muted", "muted-foreground", "accent", "border", "input", "ring"]) expect(t[n], `${theme} ${mode} --${n}`).toMatch(TRIPLET);
    }
    for (const mode of MODES) {
      const t = tokens("classic", mode);
      expect([t.background, t.popover, t.primary, t.accent, t.border]).toEqual(["0 0% 100%", "0 0% 100%", "0 0% 9%", "0 0% 96.1%", "0 0% 89.8%"]);
    }
  });

  it("defines type and shape for every theme", () => {
    for (const theme of THEMES) {
      const block = new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
      for (const name of ["f-head", "w-head", "f-body", "ls-head", "big", "r-card", "r-ctl", "f-title", "f-ui", "f-card", "w-title", "w-card", "ls-title", "r-board", "w-sub", "r-btn", "r-btn-lg", "r-pcard"]) {
        expect(block, `${theme} --${name}`).toContain(`--${name}:`);
      }
    }
  });
});
