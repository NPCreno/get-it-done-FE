import { describeFailure, isUserFacing } from "@/lib/apiClient";
import type { ApiFailure } from "@/lib/apiClient";

export interface ToastContent {
  title: string;
  description: string;
  className: string;
}

/** `id` changes on every show, so a new toast remounts `<Toast>` and gets its own timers. */
export interface ToastState {
  toast: ToastContent | null;
  exiting: boolean;
  id: number;
}

export interface ToastOptions {
  /** How long the toast stays before the exit animation starts. */
  displayMs?: number;
  exitMs?: number;
}

const SUCCESS = "text-green-600";
const ERROR = "text-error-default";

/**
 * Framework-independent toast state with ONE timer pair. It is not pure: it owns timers and
 * subscriptions. A page creates one instance (see `useToastController`) and passes that same
 * instance to the `<ToastHost>` and to every handler that reports a result.
 */
export function createToastController({ displayMs = 10_000, exitMs = 400 }: ToastOptions = {}) {
  let state: ToastState = { toast: null, exiting: false, id: 0 };
  let displayTimer: ReturnType<typeof setTimeout> | undefined;
  let exitTimer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();

  const set = (next: ToastState) => {
    state = next; // a new object only on change, so useSyncExternalStore sees a stable snapshot
    listeners.forEach((l) => l());
  };
  const clearTimers = () => {
    clearTimeout(displayTimer);
    clearTimeout(exitTimer);
    displayTimer = undefined;
    exitTimer = undefined;
  };
  const startExit = () => {
    clearTimeout(displayTimer);
    displayTimer = undefined;
    if (state.toast === null) return;
    if (!state.exiting) set({ ...state, exiting: true });
    clearTimeout(exitTimer);
    exitTimer = setTimeout(() => {
      exitTimer = undefined;
      set({ ...state, toast: null, exiting: false });
    }, exitMs);
  };

  const controller = {
    // Bound arrow functions keep one identity across renders (required by useSyncExternalStore).
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: (): ToastState => state,
    listenerCount: () => listeners.size,

    /** Shows a toast. It cancels the previous toast's timers, so the new one gets its full time. */
    show(content: ToastContent, opts: { displayMs?: number } = {}) {
      clearTimers();
      set({ toast: content, exiting: false, id: state.id + 1 });
      displayTimer = setTimeout(startExit, opts.displayMs ?? displayMs);
    },
    /** Same exit as the toast's own close button. */
    close() {
      startExit();
    },
    /** Clears timers and listeners (page unmount). Safe to call more than once. */
    dispose() {
      clearTimers();
      listeners.clear();
    },

    // Message shapes used across the pages.
    /** `message` is the backend's own success text; `fallback` is the client copy. */
    success(title: string, fallback: string, message?: string) {
      controller.show({ title, description: message || fallback, className: SUCCESS });
    },
    /** A failed request. Silent for failures the user did not cause or cannot act on. */
    failure(failure: ApiFailure) {
      if (!isUserFacing(failure)) return;
      controller.show({ ...describeFailure(failure), className: ERROR });
    },
    /** An exception thrown inside a handler. */
    unexpected(error: unknown) {
      controller.show({
        title: "Something Went Wrong",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        className: ERROR,
      });
    },
    /** An error with caller-supplied copy. */
    error(title: string, description: string) {
      controller.show({ title, description, className: ERROR });
    },
  };
  return controller;
}

export type ToastController = ReturnType<typeof createToastController>;
