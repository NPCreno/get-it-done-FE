"use client";
import { useCallback, useMemo, useState } from "react";
import { useTimer } from "@/hooks/useTimer";
import { TimerConfig as TimerDurations, type TimerType } from "@/lib/timerService";
import { timerPhase, type TimerPhase } from "@/lib/timerPhase";
import { clock, fractionLeft } from "./faceCopy";

/**
 * FEAT-10: everything about the Pomodoro that is not visuals, moved out of `modals/pomodoro.tsx`.
 * The three faces only render what this returns. Behaviour is unchanged: the same switch-type
 * confirm, the same Start / Pause / Resume (one phase, BUG-04), the same reset rule, the same
 * sounds (all in `timerService`).
 */
export interface PomodoroController {
  type: TimerType;
  timeLeft: number;
  fullDuration: number;
  isActive: boolean;
  phase: TimerPhase;
  /** "Start" | "Pause" | "Resume" from the phase. */
  action: "Start" | "Pause" | "Resume";
  /** Time left as m:ss. */
  displayTime: string;
  /** Time left / the type's full length, 0–1. */
  fraction: number;
  /** Reset shows once the time has moved away from the full length (as before). */
  canReset: boolean;
  /** Focus rounds done in this cycle, 0–4 (the ticket's pips). */
  completedFocusRounds: number;
  toggle: () => void;
  reset: () => void;
  /** Pick a timer type. Asks first when that would throw away a running or used timer. */
  requestType: (type: TimerType) => void;
  confirm: {
    pending: TimerType | null;
    accept: () => void;
    cancel: () => void;
  };
}

const ACTION: Record<TimerPhase, PomodoroController["action"]> = { idle: "Start", running: "Pause", paused: "Resume" };

export function usePomodoroController(): PomodoroController {
  const [pending, setPending] = useState<TimerType | null>(null);
  const {
    timeLeft,
    isActive,
    currentTimer,
    completedFocusRounds,
    toggle: toggleTimer,
    pause,
    reset: resetTimer,
    setCurrentTimer,
    isAtDefaultTime,
  } = useTimer("pomodoro");

  const type: TimerType = currentTimer in TimerDurations ? currentTimer : "pomodoro";
  const fullDuration = TimerDurations[type];

  const requestType = useCallback(
    (next: TimerType) => {
      // Only a different, known type.
      if (next === currentTimer || !(next in TimerDurations)) return;
      // Confirm when the timer runs or has moved away from its full length.
      if (isActive || !isAtDefaultTime) setPending(next);
      else setCurrentTimer(next);
    },
    [currentTimer, isActive, isAtDefaultTime, setCurrentTimer]
  );

  const accept = useCallback(() => {
    if (!pending) return;
    // Pause, then switch without starting.
    pause();
    setCurrentTimer(pending);
    setPending(null);
  }, [pending, pause, setCurrentTimer]);

  const cancel = useCallback(() => setPending(null), []);

  const toggle = useCallback(() => toggleTimer(), [toggleTimer]);
  const reset = useCallback(() => resetTimer(currentTimer), [currentTimer, resetTimer]);

  const phase = timerPhase(isActive, timeLeft, fullDuration);

  return useMemo(
    () => ({
      type,
      timeLeft,
      fullDuration,
      isActive,
      phase,
      action: ACTION[phase],
      displayTime: clock(timeLeft),
      fraction: fractionLeft(timeLeft, fullDuration),
      canReset: !isAtDefaultTime,
      completedFocusRounds,
      toggle,
      reset,
      requestType,
      confirm: { pending, accept, cancel },
    }),
    [type, timeLeft, fullDuration, isActive, phase, isAtDefaultTime, completedFocusRounds, toggle, reset, requestType, pending, accept, cancel]
  );
}
