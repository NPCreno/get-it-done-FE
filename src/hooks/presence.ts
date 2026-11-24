/**
 * Pure cores for the full-page loader (UX-04). `usePresence.ts` wraps them in hooks.
 */

export interface PresenceState {
  /** Render the element. */
  mounted: boolean;
  /** Rendered, but playing its exit animation. */
  leaving: boolean;
}

export interface PresenceOptions {
  /** The value of `show` on the first render. */
  show?: boolean;
  /** How long `leaving` lasts before the element unmounts. */
  exitMs?: number;
  setTimeout?: (cb: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
}

const SHOWN: PresenceState = { mounted: true, leaving: false };
const LEAVING: PresenceState = { mounted: true, leaving: true };
const GONE: PresenceState = { mounted: false, leaving: false };

/**
 * Keeps an element mounted for `exitMs` after it should hide, so it can play an exit animation.
 * Showing it again during the exit cancels the exit. It owns one timer and its subscriptions,
 * with the same `subscribe`/`getSnapshot` shape as `toastController`.
 */
export function createPresence({
  show = false,
  exitMs = 200,
  setTimeout: setTimer = (cb, ms) => setTimeout(cb, ms),
  clearTimeout: clearTimer = (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}: PresenceOptions = {}) {
  let state: PresenceState = show ? SHOWN : GONE;
  let exitTimer: unknown = undefined;
  const listeners = new Set<() => void>();

  const emit = (next: PresenceState) => {
    if (next === state) return; // the snapshot changes identity only on a real change
    state = next;
    listeners.forEach((l) => l());
  };
  const cancelExit = () => {
    if (exitTimer !== undefined) clearTimer(exitTimer);
    exitTimer = undefined;
  };

  return {
    // Arrow functions keep one identity across renders (required by useSyncExternalStore).
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: (): PresenceState => state,

    set(next: boolean) {
      if (next) {
        cancelExit();
        emit(SHOWN);
        return;
      }
      if (!state.mounted) return;
      emit(LEAVING);
      // After a dispose (React's dev double-mount) the exit timer is gone: start it again.
      if (exitTimer === undefined) {
        exitTimer = setTimer(() => {
          exitTimer = undefined;
          emit(GONE);
        }, exitMs);
      }
    },
    /** Clears the timer (unmount). Safe to call more than once. */
    dispose() {
      cancelExit();
    },
  };
}

export type Presence = ReturnType<typeof createPresence>;

/**
 * `useFirstLoad`'s reducer: true until `loading` is false once, then false for good. Start it
 * with the first `loading` value, so a page whose data is already cached never shows a loader.
 */
export function nextFirstLoad(firstLoad: boolean, loading: boolean): boolean {
  return firstLoad && loading;
}

export type PageInPhase = "idle" | "running" | "done";

/**
 * The page-in animation runs once, when the first-load loader starts leaving. A page shown
 * without a loader stays "idle" and never animates.
 */
export function nextPageIn(phase: PageInPhase, loaderLeaving: boolean): PageInPhase {
  return phase === "idle" && loaderLeaving ? "running" : phase;
}

/** Fallback end of the page-in animation (240 ms + 80 ms delay), for a tab that never fires animationend. */
export const PAGE_IN_MAX_MS = 400;
