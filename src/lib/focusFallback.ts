import type { RefObject } from "react";

const lostFocus = () => {
  const el = document.activeElement;
  return !el || el === document.body || !el.isConnected;
};

/**
 * After a delete, the button that opened the dialog is removed by the refetch,
 * so the dialog's focus return has nothing to land on and focus drops to <body>.
 * Call this from the mutation's success handler. It watches for a few seconds:
 * the first time focus is lost (body, nothing, or a removed element) it moves focus
 * to the fallback element (a page heading with tabIndex={-1}) and stops. If focus
 * is still on a live element when the time runs out, it does nothing.
 */
const POLL_MS = 100;
const WATCH_MS = 5000;

export function focusFallback(target: RefObject<HTMLElement | null>): void {
  if (typeof document === "undefined") return;
  const startedAt = Date.now();
  const timer = setInterval(() => {
    if (lostFocus()) {
      target.current?.focus({ preventScroll: true });
      clearInterval(timer);
    } else if (Date.now() - startedAt > WATCH_MS) {
      clearInterval(timer);
    }
  }, POLL_MS);
}
