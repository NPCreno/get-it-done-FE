import type { TimerType } from "./timerService";

export type TimerPhase = "idle" | "running" | "paused";

/**
 * The Pomodoro's three states (BUG-04). Running while the clock ticks; paused once stopped with
 * some time used and some left; idle otherwise: fresh, reset, a switched type, or finished at 0.
 */
export function timerPhase(isActive: boolean, timeLeft: number, fullDuration: number): TimerPhase {
  if (isActive) return "running";
  if (timeLeft > 0 && timeLeft < fullDuration) return "paused";
  return "idle";
}

const TYPE_LABEL: Record<TimerType, string> = {
  pomodoro: "Pomodoro",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

export interface TimerCopy {
  /** The sidebar button's visible text. */
  label: string;
  /** The sidebar button's accessible name. */
  ariaLabel: string;
  /** The panel's main button. */
  action: "Start" | "Pause" | "Resume";
  /** The sidebar button's hover tooltip. */
  tooltip: string;
}

/** Every label the timer shows, from its phase. `time` is the formatted time left. */
export function timerCopy(phase: TimerPhase, type: TimerType, time: string): TimerCopy {
  switch (phase) {
    case "running":
      return { label: time, ariaLabel: `Pomodoro timer: ${time} remaining`, action: "Pause", tooltip: "Timer is running" };
    case "paused":
      return { label: "Paused", ariaLabel: `Pomodoro paused: ${time} left`, action: "Resume", tooltip: "Timer is paused" };
    default:
      return {
        label: `Start ${TYPE_LABEL[type]}`,
        ariaLabel: `Start ${TYPE_LABEL[type]} timer`,
        action: "Start",
        tooltip: `Start ${TYPE_LABEL[type]}`,
      };
  }
}
