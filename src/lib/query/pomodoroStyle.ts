import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";
import { updateUser } from "@/app/api/userRequests";
import type { PomodoroStyle } from "@/app/contracts/enums";
import type { UserRecord } from "@/app/contracts/responses";
import { gatedInvalidate, invalidationsFor } from "./invalidation";
import { qk } from "./keys";
import { must, type ApiError } from "./unwrap";

/**
 * FEAT-10 Profile picker save (plan 47b §1e). Picking a style shows it at once (optimistic), then
 * saves `{ pomodoroStyle }` on its own, apart from the Profile form. Saves share one mutation
 * `scope`, so they reach the server in pick order and the last pick wins there too.
 */
export const POMODORO_STYLE_KEY = ["pomodoroStyle"] as const;
const SCOPE = { id: "profile:pomodoroStyle" };

/**
 * What is on screen versus what the server has. Rollback is compare-and-swap: a failed save only
 * puts the last confirmed style back when nothing newer was picked after it; otherwise the newer
 * pick (still saving) decides.
 */
export interface StyleSaveTracker {
  /** A pick: `previous` is on screen now, `next` replaces it. */
  begin(previous: PomodoroStyle, next: PomodoroStyle): void;
  succeed(style: PomodoroStyle): void;
  /** A failed save of `mine`: the style to restore, or null to leave the screen alone. */
  fail(mine: PomodoroStyle): PomodoroStyle | null;
  settle(): void;
  /** The style on screen (after any rollback). */
  shown(): PomodoroStyle;
}

export function createStyleSaveTracker(): StyleSaveTracker {
  let inFlight = 0;
  let confirmed: PomodoroStyle = "dial";
  let shown: PomodoroStyle = "dial";
  return {
    begin(previous, next) {
      // With nothing saving, the screen shows what the server has.
      if (inFlight === 0) confirmed = previous;
      inFlight += 1;
      shown = next;
    },
    succeed(style) {
      confirmed = style;
    },
    fail(mine) {
      if (shown !== mine) return null;
      shown = confirmed;
      return confirmed;
    },
    settle() {
      inFlight = Math.max(0, inFlight - 1);
    },
    shown: () => shown,
  };
}

/** Writes a style into the profile query cache (a no-op while the profile is not cached). */
export function writeProfileStyle(qc: QueryClient, userId: string, style: PomodoroStyle): void {
  qc.setQueryData<UserRecord>(qk.profile(userId), (old) => (old ? { ...old, pomodoroStyle: style } : old));
}

export interface PomodoroStyleVars {
  style: PomodoroStyle;
  /** The style on screen when this pick was made. */
  previous: PomodoroStyle;
}

export interface StyleSaveDeps {
  tracker: StyleSaveTracker;
  /** Puts a style on screen: the context user (the timer follows it). The cache is written here. */
  show: (style: PomodoroStyle) => void;
}

export function setPomodoroStyleOptions(
  qc: QueryClient,
  userId: string,
  deps: StyleSaveDeps
): UseMutationOptions<void, ApiError, PomodoroStyleVars> {
  const apply = (style: PomodoroStyle) => {
    writeProfileStyle(qc, userId, style);
    deps.show(style);
  };
  return {
    mutationKey: POMODORO_STYLE_KEY,
    scope: SCOPE,
    mutationFn: async ({ style }) => {
      must(await updateUser(userId, { pomodoroStyle: style }));
    },
    onMutate: async ({ style, previous }) => {
      // A profile refetch landing now would put the old value back on screen.
      await qc.cancelQueries({ queryKey: qk.profile(userId) });
      deps.tracker.begin(previous, style);
      apply(style);
    },
    onSuccess: (_d, { style }) => deps.tracker.succeed(style),
    onError: (_e, { style }) => {
      const restore = deps.tracker.fail(style);
      if (restore) apply(restore);
    },
    onSettled: () => {
      deps.tracker.settle();
      // Not returned: the status line reports the save itself, without waiting for the profile
      // refetch (which, after a failure, may be waiting on the same unreachable server).
      void gatedInvalidate(qc, POMODORO_STYLE_KEY, invalidationsFor("pomodoro-style", userId));
    },
  };
}
