import type { TimerType } from "@/lib/timerService";

/**
 * FEAT-10 colour roles for the three faces and minis (boards 17A–C), as literal Tailwind classes so
 * the content scan sees them. RD-2: every colour is a theme token, so the light/dark/theme switch
 * happens in CSS; nothing here takes `isDark`.
 * Contrast (plan 47b §1a, tested on the tokens): a primary action is `--on-acc` on `--acc`; a break
 * action is `--on-brk` on `--brk` (Classic: white on teal 5.23:1; the dark card colour on light teal in dark).
 */

export interface Surface {
  page: string;
  card: string;
  cardFill: string;
  border: string;
  lineBg: string;
  faceStroke: string;
  tick: string;
  numFill: string;
  txt: string;
  txt2: string;
  /** Teal focus ring. */
  ring: string;
  /** The ring when a parent holds the focused radio (`has-[:focus-visible]`). */
  ringWithin: string;
  /** The scrim behind the dial and the ticket. */
  scrim: string;
  /** Horizon's own field, line and ring shadow around the sun. */
  hzPage: string;
  hzLineBg: string;
  hzBorder: string;
  sunHalo: string;
  /** The ticket's perforation notches: two transparent half circles cut from the card colour. */
  notches: string;
  hover: string;
}

/**
 * RD-2 (plan 52-1): one palette, from theme tokens, so it follows the theme and the mode by itself.
 * Classic's token values are exactly the FEAT-10 colours (white card, light grey line, dark grey text and
 * teal focus in light; the dark card, gray-800, white, gray-400 and light teal in dark).
 */
const SURFACE: Surface = {
  page: "bg-th-page",
  card: "bg-th-card",
  cardFill: "fill-th-card",
  border: "border-th-line",
  lineBg: "bg-th-line",
  faceStroke: "stroke-th-line",
  tick: "stroke-th-tick",
  numFill: "fill-th-ink2",
  txt: "text-th-ink",
  txt2: "text-th-ink2",
  ring: "outline-none focus-visible:ring-2 focus-visible:ring-th-focus focus-visible:ring-offset-2 focus-visible:ring-offset-th-card",
  ringWithin: "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-th-focus has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-th-card",
  scrim: "bg-th-pom-scrim",
  hzPage: "bg-th-hz-page",
  hzLineBg: "bg-th-hz-line",
  hzBorder: "border-th-hz-line",
  sunHalo: "shadow-[0_0_0_5px_var(--hz-page)]",
  notches:
    "[background:radial-gradient(circle_at_left,transparent_12px,var(--card)_12.5px)_left/51%_100%_no-repeat,radial-gradient(circle_at_right,transparent_12px,var(--card)_12.5px)_right/51%_100%_no-repeat]",
  hover: "hover:bg-th-hover",
};

export function surface(): Surface {
  return SURFACE;
}

export interface Accent {
  /** Solid shape: the wedge's fill, drain, pips, sun, strips. */
  bg: string;
  fill: string;
  /** Text in the accent (kickers). */
  text: string;
  /** Selected mode background. */
  sub: string;
  /** Selected mode border (2 px). */
  border: string;
  /** The main action button. */
  action: string;
  /** Horizon's selected tab underline. */
  underline: string;
  /** Horizon's sun: solid for focus, a hollow ring for breaks. */
  sun: string;
}

const FOCUS: Accent = {
  bg: "bg-th-acc",
  fill: "fill-th-acc",
  text: "text-th-acc-t",
  sub: "bg-th-acc-sub",
  border: "border-th-acc-t",
  action: "bg-th-acc text-th-on-acc",
  underline: "shadow-[inset_0_-2px_0_var(--acc)]",
  sun: "bg-th-acc",
};
const BREAK: Accent = {
  bg: "bg-th-brk",
  fill: "fill-th-brk",
  text: "text-th-brk-t",
  sub: "bg-th-brk-sub",
  border: "border-th-brk",
  action: "bg-th-brk text-th-on-brk",
  underline: "shadow-[inset_0_-2px_0_var(--brk)]",
  sun: "bg-th-hz-page border-[3px] border-th-brk",
};

/**
 * The mode's accent. The dial draws a short break's wedge (and its mini) in the lighter teal
 * (`--brk-wedge`); everything else uses `--brk` for breaks.
 */
export function accent(type: TimerType, dialWedge = false): Accent {
  if (type === "pomodoro") return FOCUS;
  if (dialWedge && type === "shortBreak") return { ...BREAK, bg: "bg-th-brk-wedge", fill: "fill-th-brk-wedge" };
  return BREAK;
}
