import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";
import { updateUser } from "@/app/api/userRequests";
import type { UpdateUserRequest } from "@/app/contracts/requests";
import type { UserRecord } from "@/app/contracts/responses";
import type { Appearance } from "@/lib/appearance";
import { gatedInvalidate, invalidationsFor } from "./invalidation";
import { qk } from "./keys";
import { must, type ApiError } from "./unwrap";

/**
 * RD-1 Appearance card save (plan 51b §5), the same pattern as the Pomodoro style (FEAT-10):
 * a pick shows at once everywhere (the context user and the profile cache), then saves on its
 * own, apart from the Profile form. Saves share one mutation `scope`, so they reach the server in
 * pick order and the last pick wins there too.
 */
export const APPEARANCE_KEY = ["appearance"] as const;
const SCOPE = { id: "profile:appearance" };

const same = (a: Appearance, b: Appearance) => a.theme === b.theme && a.mode === b.mode;

/**
 * What is on screen versus what the server has. Rollback is compare-and-swap: a failed save puts
 * the last confirmed appearance back only when nothing newer was picked after it.
 */
export interface AppearanceSaveTracker {
  /** A pick: `previous` is on screen now, `next` replaces it. */
  begin(previous: Appearance, next: Appearance): void;
  succeed(a: Appearance): void;
  /** A failed save of `mine`: the appearance to restore, or null to leave the screen alone. */
  fail(mine: Appearance): Appearance | null;
  settle(): void;
  /** The appearance on screen (after any rollback). */
  shown(): Appearance;
}

export function createAppearanceSaveTracker(initial: Appearance = { theme: "classic", mode: "light" }): AppearanceSaveTracker {
  let inFlight = 0;
  let confirmed = initial;
  let shown = initial;
  return {
    begin(previous, next) {
      // With nothing saving, the screen shows what the server has.
      if (inFlight === 0) confirmed = previous;
      inFlight += 1;
      shown = next;
    },
    succeed(a) {
      confirmed = a;
    },
    fail(mine) {
      if (!same(shown, mine)) return null;
      shown = confirmed;
      return confirmed;
    },
    settle() {
      inFlight = Math.max(0, inFlight - 1);
    },
    shown: () => shown,
  };
}

/** Only what changed is sent (`theme` is the mode, `appTheme` the theme family). */
export function appearanceUpdateBody(previous: Appearance, next: Appearance): UpdateUserRequest {
  const body: UpdateUserRequest = {};
  if (next.mode !== previous.mode) body.theme = next.mode;
  if (next.theme !== previous.theme) body.appTheme = next.theme;
  return body;
}

/** Writes an appearance into the profile query cache (a no-op while the profile is not cached). */
export function writeProfileAppearance(qc: QueryClient, userId: string, a: Appearance): void {
  qc.setQueryData<UserRecord>(qk.profile(userId), (old) => (old ? { ...old, theme: a.mode, appTheme: a.theme } : old));
}

export interface AppearanceVars {
  next: Appearance;
  /** The appearance on screen when this pick was made. */
  previous: Appearance;
}

export interface AppearanceSaveDeps {
  tracker: AppearanceSaveTracker;
  /** Puts an appearance on screen: the context user (the whole app follows it). */
  show: (a: Appearance) => void;
}

export function setAppearanceOptions(
  qc: QueryClient,
  userId: string,
  deps: AppearanceSaveDeps
): UseMutationOptions<void, ApiError, AppearanceVars> {
  const apply = (a: Appearance) => {
    writeProfileAppearance(qc, userId, a);
    deps.show(a);
  };
  return {
    mutationKey: APPEARANCE_KEY,
    scope: SCOPE,
    mutationFn: async ({ next, previous }) => {
      must(await updateUser(userId, appearanceUpdateBody(previous, next)));
    },
    onMutate: async ({ next, previous }) => {
      // A profile refetch landing now would put the old value back on screen.
      await qc.cancelQueries({ queryKey: qk.profile(userId) });
      deps.tracker.begin(previous, next);
      apply(next);
    },
    onSuccess: (_d, { next }) => deps.tracker.succeed(next),
    onError: (_e, { next }) => {
      const restore = deps.tracker.fail(next);
      if (restore) apply(restore);
    },
    onSettled: () => {
      deps.tracker.settle();
      // Not returned: the status line reports the save itself, not the refetch.
      void gatedInvalidate(qc, APPEARANCE_KEY, invalidationsFor("appearance", userId));
    },
  };
}
