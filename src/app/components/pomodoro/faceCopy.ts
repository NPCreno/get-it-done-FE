import type { TimerPhase } from "@/lib/timerPhase";
import { FOCUS_ROUNDS_PER_CYCLE, type TimerType } from "@/lib/timerService";

/**
 * FEAT-10 copy and pure numbers shared by the three faces and the sidebar minis (boards 17A–C).
 * No emoji: one quiet line per situation.
 */

const LINES: Record<TimerType, string> = {
  pomodoro: "Focus on one thing.",
  shortBreak: "Step away from the screen.",
  longBreak: "Time for a longer break. Get some air.",
};

export const PAUSED_LINE = "Paused. Pick it up when you’re ready.";

/** The one line under the time. */
export function faceLine(phase: TimerPhase, type: TimerType): string {
  return phase === "paused" ? PAUSED_LINE : LINES[type];
}

/** Mode names: `short` for the dial's pills and the horizon's phone tabs, `long` elsewhere. */
export const MODE_NAMES: Record<TimerType, { short: string; long: string }> = {
  pomodoro: { short: "Focus", long: "Focus" },
  shortBreak: { short: "Short", long: "Short break" },
  longBreak: { short: "Long", long: "Long break" },
};

export const TIMER_TYPES: readonly TimerType[] = ["pomodoro", "shortBreak", "longBreak"];

/** Time left as m:ss ("25:00", "3:10"), never negative. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Share of the round left, 0–1 (the ticket's drain bar). Clamped; a broken duration is 0. */
export function fractionLeft(timeLeft: number, fullDuration: number): number {
  if (!(fullDuration > 0) || !Number.isFinite(timeLeft)) return 0;
  return Math.min(1, Math.max(0, timeLeft / fullDuration));
}

/** Share of the round done, 0–1 (the horizon's sun). */
export function fractionDone(timeLeft: number, fullDuration: number): number {
  return 1 - fractionLeft(timeLeft, fullDuration);
}

/** A CSS percentage with one decimal. */
export function pct(fraction: number): string {
  return `${(Math.min(1, Math.max(0, fraction)) * 100).toFixed(1)}%`;
}

/** The kicker over the time (ticket and horizon). */
export function kicker(phase: TimerPhase, type: TimerType, rounds: number, withRound: boolean): string {
  if (type !== "pomodoro") return MODE_NAMES[type].long;
  if (phase === "paused") return "Focus · paused";
  if (withRound && rounds < FOCUS_ROUNDS_PER_CYCLE) return `Focus · round ${rounds + 1}`;
  return "Focus";
}

/**
 * The ticket stub's "Next" line. Only a suggestion: nothing advances by itself (plan 47b §1d).
 * During focus, `rounds` done so far decides it: rounds 1–3 are followed by a short break, round 4
 * by a long one.
 */
export function nextHint(rounds: number, type: TimerType = "pomodoro"): string {
  if (type === "shortBreak") return `Next: focus round ${Math.min(rounds + 1, FOCUS_ROUNDS_PER_CYCLE)}`;
  if (type === "longBreak") return "Then the cycle starts again";
  return rounds >= FOCUS_ROUNDS_PER_CYCLE - 1 ? "Next: a long break" : "Next: a 5-minute break";
}

/** The pips' accessible label and visible caption. */
export function pipsLabel(rounds: number): string {
  return `${rounds} of ${FOCUS_ROUNDS_PER_CYCLE} focus rounds done`;
}

/**
 * The small caption on the ticket and horizon minis (the dial mini uses `timerCopy().label`).
 * Idle "Start", paused "Paused", a running break "Break"; a running focus round shows the round on
 * the ticket ("2 of 4") and "Focus" on the horizon.
 */
export function miniCaption(style: "ticket" | "horizon", phase: TimerPhase, type: TimerType, rounds: number): string {
  if (phase === "idle") return "Start";
  if (phase === "paused") return "Paused";
  if (type !== "pomodoro") return "Break";
  return style === "ticket" ? `${Math.min(rounds + 1, FOCUS_ROUNDS_PER_CYCLE)} of ${FOCUS_ROUNDS_PER_CYCLE}` : "Focus";
}
