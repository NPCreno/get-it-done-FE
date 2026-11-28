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
    "ico-check", "dot-low", "dot-med", "dot-high", "dot-done", "ok-t", "ncard-bg", "ncard-t", "ncard-t2", "code-bg", "acc-t-light",
    // Plan 52-4: outside the app (auth, consent, demo), the wake banner, the step-6 button fills, the sidebar hover
    "out-bg", "out-note", "auth-a", "auth-b", "auth-ink", "wake-line", "wake-b", "wake-ic-bg", "wake-ok-bg", "wake-ok-line",
    "wake-ok-ic", "on-wake-ok", "danger", "danger-h", "on-danger", "info", "info-h", "on-info", "acc-wash",
    "note-bg", "note-line", "note-t", "alert-bg", "alert-t",
    // Plan 53b §1 (RD-3): red text, status colours, stat-card icons, the check disc
    "danger-t", "warn-t", "badge-unread", "on-badge-unread", "streak-hot", "on-streak-hot", "streak-fire",
    "toast-ok-bg", "toast-ok-line", "toast-ok-t", "toast-err-bg", "toast-err-line", "toast-err-t",
    "toast-warn-bg", "toast-warn-line", "toast-warn-t", "toast-info-bg", "toast-info-line", "toast-info-t",
    "tag-ok-bg", "tag-ok-t", "tag-off-bg", "tag-off-t", "tag-err-bg", "tag-err-t",
    "due-hot-bg", "due-hot-t", "due-hot-b", "due-warn-bg", "due-warn-t", "due-warn-b", "unread-bar", "drawer-scrim",
    "stat-ico-all", "stat-ico-todo", "stat-ico-proj", "stat-ico-done", "stat-ico-hand", "check-fill",
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
    ["danger-t", "card", 4.5],
    ["ico-date", "card", 3],
    ["ico-close", "card", 3],
    ["ico-check", "card", 3],
    // Plan 52-4
    ["txt-abs", "out-bg", 4.5],
    ["out-note", "out-bg", 4.5],
    ["auth-ink", "auth-a", 4.5],
    ["auth-ink", "auth-b", 4.5],
    ["txt", "acc-sub", 4.5],
    ["wake-b", "acc-sub", 4.5],
    ["acc-t", "wake-ic-bg", 3],
    ["ok-t", "wake-ok-bg", 4.5],
    ["on-wake-ok", "wake-ok-ic", 3],
    ["on-danger", "danger", 4.5],
    ["on-danger", "danger-h", 4.5],
    ["on-info", "info", 4.5],
    ["on-info", "info-h", 4.5],
    ["ico-close", "toast-bg", 3],
    ["note-t", "note-bg", 4.5],
    ["alert-t", "alert-bg", 4.5],
    // Plan 53b §1 (RD-3): red text and outline borders on both surfaces; status colours with their text
    ["danger-t", "page", 4.5],
    ["warn-t", "card", 4.5],
    ["on-badge-unread", "badge-unread", 4.5],
    ["on-streak-hot", "streak-hot", 4.5],
    ["toast-ok-t", "toast-ok-bg", 4.5],
    ["toast-err-t", "toast-err-bg", 4.5],
    ["toast-warn-t", "toast-warn-bg", 4.5],
    ["toast-info-t", "toast-info-bg", 4.5],
    ["toast-note", "toast-ok-bg", 4.5],
    ["toast-note", "toast-err-bg", 4.5],
    ["toast-note", "toast-warn-bg", 4.5],
    ["toast-note", "toast-info-bg", 4.5],
    ["tag-ok-t", "tag-ok-bg", 4.5],
    ["tag-off-t", "tag-off-bg", 4.5],
    ["tag-err-t", "tag-err-bg", 4.5],
    ["due-hot-t", "due-hot-bg", 4.5],
    ["due-warn-t", "due-warn-bg", 4.5],
    ["ok-t", "tag-ok-bg", 3],
    ["acc-t", "card", 3],
    ["on-acc", "acc", 3],
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

  /**
   * Plan 53b §1.2: the stat-card icons are visible on their tile (3:1, WCAG 1.4.11), in every theme and mode, so
   * the "All tasks" icon is no longer #333 on the dark tile. One named exception: Classic light keeps today's
   * pixels (amber timer on the white tile, 1.9:1); the card's label "TO DO" names it.
   */
  const STAT_ICON_EXCEPTIONS = [{ block: "classic/light", token: "stat-ico-todo" }];
  it("stat-card icons are ≥ 3:1 on their tile (one named Classic-light exception)", () => {
    for (const theme of THEMES) for (const mode of MODES) {
      const t = tokens(theme, mode);
      for (const tok of ["stat-ico-all", "stat-ico-todo", "stat-ico-proj", "stat-ico-done"]) {
        const exempt = STAT_ICON_EXCEPTIONS.some((e) => e.block === `${theme}/${mode}` && e.token === tok);
        const ratio = contrast(t[tok], t["tile-bg"]);
        if (exempt) expect(ratio, `${theme} ${mode} --${tok} (still the exception)`).toBeLessThan(3);
        else expect(ratio, `${theme} ${mode} --${tok}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("Classic's RD-3 values: red text #BE2E2B in light (dark unchanged), icons keep today's colours", () => {
    const light = tokens("classic", "light");
    const dark = tokens("classic", "dark");
    expect([light["danger-t"], dark["danger-t"]]).toEqual(["#BE2E2B", "#FD3D39"]);
    expect([light["stat-ico-all"], light["stat-ico-todo"], light["stat-ico-proj"], light["stat-ico-done"], light["stat-ico-hand"]]).toEqual(["#333333", "#FEAD03", "#2196F3", "#3EA24F", "#666666"]);
    expect([dark["stat-ico-todo"], dark["stat-ico-proj"], dark["stat-ico-done"]]).toEqual(["#FEAD03", "#2196F3", "#3EA24F"]);
    expect([light["check-fill"], dark["check-fill"], light["unread-bar"]]).toEqual(["#53D86A", "#53D86A", "#219EBC"]);
    // Toast variant boxes keep today's light palette in Classic light (green/red/amber/blue-50, -200, -700).
    expect([light["toast-ok-bg"], light["toast-ok-line"], light["toast-ok-t"]]).toEqual(["#F0FDF4", "#BBF7D0", "#15803D"]);
  });

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

  it("Classic's step-6 fixes (plan 52-4) hold their values; everything else outside the app is today's colour", () => {
    for (const mode of MODES) {
      const t = tokens("classic", mode);
      // White on #BE2E2B (5.8:1) and #2563EB (5.2:1), was white on #FD3D39 / #FE6E6B / #EF4444 / #3B82F6 (3.0–3.8:1).
      expect([t.danger, t["on-danger"], t.info, t["on-info"]]).toEqual(["#BE2E2B", "#FFFFFF", "#2563EB", "#FFFFFF"]);
      // The auth panel keeps its amber gradient; its text is #333 like every label on amber (was white, 1.9:1).
      expect([t["auth-a"], t["auth-b"], t["auth-ink"]]).toEqual(["#FEAD03", "#FEEAC0", "#333333"]);
    }
    const light = tokens("classic", "light");
    const dark = tokens("classic", "dark");
    // Board 15 (UX-03 wake banner) and today's white auth and demo canvas in light.
    expect([light["wake-line"], light["wake-b"], light["wake-ok-bg"], light["wake-ok-ic"]]).toEqual(["#FED580", "#7F5601", "#D4F5D9", "#296C35"]);
    expect([dark["wake-line"], dark["wake-b"], dark["wake-ok-bg"], dark["wake-ok-ic"]]).toEqual(["#7F5601", "#FED580", "#1A2E21", "#53D86A"]);
    expect([light["out-bg"], light["out-note"]]).toEqual(["#FFFFFF", "#737373"]);
    // Consent loopback note (amber-50/300/900) and error boxes (red-100/700) keep today's light colours.
    expect([light["note-bg"], light["note-line"], light["note-t"], light["alert-bg"], light["alert-t"]]).toEqual(["#FFFBEB", "#FCD34D", "#78350F", "#FEE2E2", "#B91C1C"]);
  });

  /**
   * The ONE contrast exception left after Phase 2 (plan 52-4, approved): the landing page hero, white and
   * cream text on the amber gradient (src/app/page.tsx, `from-primary-default to-primary-100 text-white`).
   * The page is not on theme tokens: Phase 6 rewrites it. Remove this entry then; the test below fails as
   * soon as the hero stops using these colours, so the exception can't outlive the problem.
   */
  const EXCEPTIONS = [{ where: "landing hero (src/app/page.tsx), Phase 6", fg: "#FFFFFF", bg: "#FEAD03" }];

  it("only the landing hero is exempt, and it is still the failing pair it names", () => {
    expect(EXCEPTIONS).toHaveLength(1);
    const page = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");
    expect(page).toContain("from-primary-default to-primary-100 text-white");
    for (const e of EXCEPTIONS) expect(contrast(e.fg, e.bg)).toBeLessThan(4.5);
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
