"use client";
import { AlertTriangle } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { describeLoadFailure, type ApiFailure } from "@/lib/apiClient";

interface LoadErrorProps {
  /** Display name of the widget, e.g. "your tasks". Client-authored. */
  widget: string;
  failure: ApiFailure;
  onRetry: () => void;
  retrying: boolean;
  theme?: string | null;
  variant?: "full" | "compact";
}

/**
 * The one retry component. The live region holds TEXT ONLY; the button is a
 * sibling, so it is not re-announced. aria-disabled (not disabled) keeps the
 * button focusable while retrying so focus is not lost to <body>.
 */
export default function LoadError({ widget, failure, onRetry, retrying, theme, variant = "full" }: LoadErrorProps) {
  const msgId = useId();
  const dark = theme === "dark";
  const compact = variant === "compact";
  const text = compact
    ? `Couldn't refresh ${widget}. ${describeLoadFailure(failure)}`
    : `Couldn't load ${widget}. ${describeLoadFailure(failure)}`;

  return (
    <div
      data-load-error
      className={`flex ${compact ? "flex-row items-center gap-3 px-3 py-2 text-xs" : "flex-col items-center justify-center gap-3 p-6 text-sm text-center"} w-full rounded-[10px] border font-lato ${
        dark ? "border-gray-700 bg-gray-800/50 text-white" : "border-[#E0E0E0] bg-white text-text"
      }`}
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
        className="rounded-[5px] border border-primary-200 px-3 py-1 font-bold text-primary-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default focus-visible:ring-offset-2 aria-disabled:opacity-60"
      >
        {retrying ? "Retrying…" : "Try again"}
      </button>
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
