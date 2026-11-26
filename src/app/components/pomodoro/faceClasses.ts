import type { TimerType } from "@/lib/timerService";

/**
 * FEAT-10 colour roles for the three faces and minis (boards 17A–C), as literal Tailwind classes so
 * the content scan sees them. Light and dark come from `useAppearance().isDark`, like the rest of the app.
 * Contrast (plan 47b §1a): a primary action is `text-text` on amber (6.73:1), never white on amber;
 * a break action is white on secondary-500 (5.23:1), or foreground-dark on secondary-300 in dark.
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

const LIGHT: Surface = {
  page: "bg-background-light",
  card: "bg-white",
  cardFill: "fill-white",
  border: "border-[#E0E0E0]",
  lineBg: "bg-[#E0E0E0]",
  faceStroke: "stroke-[#E0E0E0]",
  tick: "stroke-[#B8B8B8]",
  numFill: "fill-[#676767]",
  txt: "text-text",
  txt2: "text-[#676767]",
  ring: "outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  ringWithin: "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-secondary-500 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-white",
  scrim: "bg-[rgba(17,19,23,.45)]",
  hzPage: "bg-[#F2F0EA]",
  hzLineBg: "bg-[#D9D5CC]",
  hzBorder: "border-[#D9D5CC]",
  sunHalo: "shadow-[0_0_0_5px_#F2F0EA]",
  notches:
    "[background:radial-gradient(circle_at_left,transparent_12px,#FFFFFF_12.5px)_left/51%_100%_no-repeat,radial-gradient(circle_at_right,transparent_12px,#FFFFFF_12.5px)_right/51%_100%_no-repeat]",
  hover: "hover:bg-black/5",
};

const DARK: Surface = {
  page: "bg-background-dark",
  card: "bg-foreground-dark",
  cardFill: "fill-foreground-dark",
  border: "border-gray-800",
  lineBg: "bg-gray-800",
  faceStroke: "stroke-gray-800",
  tick: "stroke-gray-600",
  numFill: "fill-gray-400",
  txt: "text-white",
  txt2: "text-gray-400",
  ring: "outline-none focus-visible:ring-2 focus-visible:ring-secondary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground-dark",
  ringWithin: "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-secondary-300 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-foreground-dark",
  scrim: "bg-[rgba(0,0,0,.62)]",
  hzPage: "bg-background-dark",
  hzLineBg: "bg-[#262A33]",
  hzBorder: "border-[#262A33]",
  sunHalo: "shadow-[0_0_0_5px_#0D0E12]",
  notches:
    "[background:radial-gradient(circle_at_left,transparent_12px,#111317_12.5px)_left/51%_100%_no-repeat,radial-gradient(circle_at_right,transparent_12px,#111317_12.5px)_right/51%_100%_no-repeat]",
  hover: "hover:bg-white/5",
};

export function surface(dark: boolean): Surface {
  return dark ? DARK : LIGHT;
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

const FOCUS_LIGHT: Accent = {
  bg: "bg-primary-default",
  fill: "fill-primary-default",
  text: "text-primary-600",
  sub: "bg-primary-100",
  border: "border-primary-600",
  action: "bg-primary-default text-text",
  underline: "shadow-[inset_0_-2px_0_#FEAD03]",
  sun: "bg-primary-default",
};
const FOCUS_DARK: Accent = {
  ...FOCUS_LIGHT,
  text: "text-primary-default",
  sub: "bg-primary-700",
  border: "border-primary-default",
};
const BREAK_LIGHT: Accent = {
  bg: "bg-secondary-500",
  fill: "fill-secondary-500",
  text: "text-secondary-500",
  sub: "bg-secondary-100",
  border: "border-secondary-500",
  action: "bg-secondary-500 text-white",
  underline: "shadow-[inset_0_-2px_0_#19768D]",
  sun: "bg-[#F2F0EA] border-[3px] border-secondary-500",
};
const BREAK_DARK: Accent = {
  bg: "bg-secondary-300",
  fill: "fill-secondary-300",
  text: "text-secondary-300",
  sub: "bg-secondary-700",
  border: "border-secondary-300",
  action: "bg-secondary-300 text-foreground-dark",
  underline: "shadow-[inset_0_-2px_0_#59B6CD]",
  sun: "bg-background-dark border-[3px] border-secondary-300",
};

/**
 * The mode's accent. The dial draws a short break's wedge (and its mini) in the lighter teal
 * (`secondary-default`); everything else uses the deep teal for breaks.
 */
export function accent(dark: boolean, type: TimerType, dialWedge = false): Accent {
  if (type === "pomodoro") return dark ? FOCUS_DARK : FOCUS_LIGHT;
  const base = dark ? BREAK_DARK : BREAK_LIGHT;
  if (dialWedge && type === "shortBreak") return { ...base, bg: "bg-secondary-default", fill: "fill-secondary-default" };
  return base;
}
