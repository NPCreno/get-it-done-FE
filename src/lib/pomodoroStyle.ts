import { narrow, POMODORO_STYLES, type PomodoroStyle } from "@/app/contracts/enums";

/**
 * FEAT-10: the timer style a user picked in Profile → Appearance. No choice yet (null, a row from
 * before the field existed) or anything unknown means the dial. Pure: callers pass `userData`.
 */
export function pomodoroStyleOf(user: { pomodoroStyle?: string | null } | null | undefined): PomodoroStyle {
  return narrow(POMODORO_STYLES, user?.pomodoroStyle) ?? "dial";
}

export const POMODORO_STYLE_NAMES: Record<PomodoroStyle, string> = {
  dial: "Dial",
  ticket: "Ticket",
  horizon: "Horizon",
};

/** The picker cards' one-liners (board 17D). */
export const POMODORO_STYLE_HINTS: Record<PomodoroStyle, string> = {
  dial: "A kitchen timer with a shrinking wedge",
  ticket: "Big numbers and a draining bar",
  horizon: "Full-screen focus with a moving sun",
};

/** What the picker's status line says. `restored` is the style it went back to after a failed save. */
export type PickerStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; style: PomodoroStyle }
  | { kind: "failed"; restored: PomodoroStyle };

export function pickerStatusText(status: PickerStatus): string {
  switch (status.kind) {
    case "idle":
      return "";
    case "saving":
      return "Saving…";
    case "saved":
      return `Saved. The timer now uses ${POMODORO_STYLE_NAMES[status.style]}.`;
    case "failed":
      return `Couldn’t save your timer style. It’s back to ${POMODORO_STYLE_NAMES[status.restored]}; try again.`;
  }
}

/** How long "Saved…" stays before the line clears. */
export const SAVED_STATUS_MS = 3000;
