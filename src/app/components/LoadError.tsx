"use client";
import { AlertTriangle } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { describeLoadFailure, type ApiFailure } from "@/lib/apiClient";
import { showWaitingForServer } from "@/lib/serverWakeView";
import { useServerWake } from "@/lib/useServerWake";

interface LoadErrorProps {
  /** Display name of the widget, e.g. "your tasks". Client-authored. */
  widget: string;
  failure: ApiFailure;
  onRetry: () => void;
  retrying: boolean;
  variant?: "full" | "compact";
}

/**
 * The one retry component. The live region holds TEXT ONLY; the button is a
 * sibling, so it is not re-announced. aria-disabled (not disabled) keeps the
 * button focusable while retrying so focus is not lost to <body>.
 */
export default function LoadError({ widget, failure, onRetry, retrying, variant = "full" }: LoadErrorProps) {
  const msgId = useId();
  const wake = useServerWake();
  const compact = variant === "compact";

  // UX-03: while the server wakes (or refetches right after it woke), a network/timeout failure
  // waits quietly instead of showing the error. No button and no live region: the banner speaks.
  if (showWaitingForServer(failure.kind, wake, retrying, Date.now())) {
    return <WaitingForServer compact={compact} />;
  }
  const text = compact
    ? `Couldn't refresh ${widget}. ${describeLoadFailure(failure)}`
    : `Couldn't load ${widget}. ${describeLoadFailure(failure)}`;

  return (
    <div
      data-load-error
      className={`flex ${compact ? "flex-row items-center gap-3 px-3 py-2 text-xs" : "flex-col items-center justify-center gap-3 p-6 text-sm text-center"} w-full rounded-[10px] border font-lato border-th-row-edge bg-th-row-bg text-th-ink`}
    >
      <AlertTriangle aria-hidden="true" className={`${compact ? "h-4 w-4" : "h-6 w-6"} shrink-0 text-error-default`} />
      <p id={msgId} role="status" aria-live="polite" aria-atomic="true">
        {text}
      </p>
      <button
        type="button"
        aria-describedby={msgId}
        aria-disabled={retrying}
        onClick={retrying ? undefined : onRetry}
        className="rounded-[5px] border border-th-acc-soft px-3 py-1 font-bold text-th-acc-t focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] aria-disabled:opacity-60"
      >
        {retrying ? "Retrying…" : "Try again"}
      </button>
    </div>
  );
}

/**
 * The waiting variant: a skeleton that fills the card (full), or one skeleton line (compact).
 * No text: the wake banner above already says the app is waiting for the server (user's call,
 * 2026-11-25, replacing the canvas's "Waiting for the server" caption).
 */
function WaitingForServer({ compact }: { compact: boolean }) {
  const bar = "block rounded-md motion-safe:animate-pulse bg-th-wait-bar";
  if (compact) {
    return (
      <div data-load-waiting aria-hidden="true" className="flex w-full items-center px-3 py-2">
        <span className={`${bar} h-3 w-1/2`} />
      </div>
    );
  }
  return (
    <div
      data-load-waiting
      aria-hidden="true"
      className={`flex h-full min-h-[120px] w-full flex-col gap-3 rounded-[10px] border p-4 border-th-row-edge bg-th-row-bg`}
    >
      <span className={`${bar} h-3 w-[40%]`} />
      <span className={`${bar} h-7 w-[55%]`} />
      <span className={`${bar} h-3 w-full`} />
      <span className={`${bar} h-3 w-[80%]`} />
      <span className={`${bar} min-h-3 w-full flex-1`} />
    </div>
  );
}

/**
 * After a successful retry the error block unmounts. If focus was inside it,
 * move focus to the widget container (give it tabIndex={-1} and this ref).
 */
export function useRecoveryFocus<T extends HTMLElement>(status: string) {
  const ref = useRef<T>(null);
  const prev = useRef(status);
  const focusWasInError = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onFocusIn = (e: FocusEvent) => {
      focusWasInError.current = !!(e.target as HTMLElement).closest?.("[data-load-error]");
    };
    el.addEventListener("focusin", onFocusIn);
    return () => el.removeEventListener("focusin", onFocusIn);
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (prev.current === "error" && status !== "error" && focusWasInError.current) {
      ref.current?.focus();
      focusWasInError.current = false;
    }
    prev.current = status;
  }, [status]);

  return ref;
}
