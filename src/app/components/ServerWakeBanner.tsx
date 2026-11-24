"use client";
import { Check, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { serverWake } from "@/lib/serverWake";
import { AWAKE_HOLD_MS, bannerPhase, formatElapsed, type BannerPhase } from "@/lib/serverWakeView";
import { useServerWake } from "@/lib/useServerWake";
import { useNextFrame, useTicker } from "@/lib/useTicker";
import WakeIcon from "./WakeIcon";

/** Unmount this long after folding away (a timeout, so reduced motion is covered too). */
const FOLD_MS = 260;

type Shown = Exclude<BannerPhase, "hidden"> | "awake";

const COPY: Record<Shown, { title: string; body?: string }> = {
  waking: {
    title: "Waking up the server…",
    body: "It naps when nobody’s using it. This can take up to a minute, and your data will load by itself.",
  },
  longer: {
    title: "Still waking up the server…",
    body: "The first visit of the day can take a little over a minute. Keep this tab open; nothing you’ve done is lost.",
  },
  down: {
    title: "The server still isn’t answering.",
    body: "Check your connection, or try again in a minute.",
  },
  awake: { title: "The server’s awake. Loading your data." },
};

/**
 * UX-03: one banner at the top of `MainLayout`'s content while the backend wakes up.
 * A (waking) → B (longer, from 45 s) → D (awake, green for 1.2 s, then folds away), or C (down,
 * after 3 minutes) with Try again. Only the two text lines are a live region.
 */
export default function ServerWakeBanner({ dark }: { dark: boolean }) {
  const wake = useServerWake();
  const now = useTicker(wake.state === "waking" && !wake.gaveUp);
  const phase = bannerPhase({ ...wake, now });

  const [shown, setShown] = useState<Shown | null>(null);
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const textReady = useNextFrame(shown !== null);

  useEffect(() => {
    if (phase !== "hidden") {
      setShown(phase);
      // Mount closed, open on the next frame so the row-height transition runs.
      const raf = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(raf);
    }
    // Back to awake: if a banner was showing, turn it green, hold, fold away, then unmount.
    setShown((prev) => (prev === null ? null : "awake"));
    const fold = setTimeout(() => setOpen(false), AWAKE_HOLD_MS);
    const unmount = setTimeout(() => setShown(null), AWAKE_HOLD_MS + FOLD_MS);
    return () => {
      clearTimeout(fold);
      clearTimeout(unmount);
    };
  }, [phase]);

  if (shown === null) return null;

  const awake = shown === "awake";
  const moving = shown === "waking" || shown === "longer";
  const copy = COPY[shown];

  const onRetry = () => {
    // The button unmounts with the state change: keep focus on the banner, not <body>.
    cardRef.current?.focus();
    serverWake.retry();
  };

  const card = awake
    ? dark
      ? "bg-success-dark-100 border-success-dark-200"
      : "bg-success-100 border-success-200"
    : dark
      ? "bg-primary-700 border-primary-600"
      : "bg-primary-100 border-primary-200";
  const titleColor = awake ? (dark ? "text-success-dark-700" : "text-success-600") : dark ? "text-white" : "text-text";
  const bodyColor = dark ? "text-primary-200" : "text-primary-600";

  // Transition duration and easing use arbitrary properties: tailwindcss-animate makes the
  // arbitrary-value duration and ease classes ambiguous, and Tailwind then skips them.
  return (
    <div
      data-server-wake-banner
      className={`grid transition-[grid-template-rows,opacity,margin] motion-reduce:transition-opacity motion-reduce:[transition-duration:120ms] ${
        open
          ? "grid-rows-[1fr] opacity-100 mb-5 [transition-duration:220ms] [transition-timing-function:cubic-bezier(.2,.8,.2,1)]"
          : "grid-rows-[0fr] opacity-0 mb-0 [transition-duration:240ms] [transition-timing-function:ease-in]"
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          ref={cardRef}
          tabIndex={-1}
          className={`relative overflow-hidden rounded-[10px] border grid grid-cols-[40px_minmax(0,1fr)] md:grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3.5 px-4 pt-3.5 pb-4 font-lato outline-none transition-colors duration-200 ${card}`}
        >
          {awake ? (
            <span
              aria-hidden="true"
              className={`grid place-items-center size-10 rounded-full transition-colors duration-200 motion-safe:animate-wake-pop ${
                dark ? "bg-success-default text-success-dark-100" : "bg-success-600 text-white"
              }`}
            >
              <Check size={20} strokeWidth={3} />
            </span>
          ) : (
            <WakeIcon dark={dark} moving={moving} />
          )}

          <div role="status" aria-live="polite" aria-atomic="true" className="min-w-0">
            {textReady && (
              <>
                <p className={`font-lato font-bold text-[15px] leading-5 ${titleColor}`}>{copy.title}</p>
                {copy.body && <p className={`text-sm max-w-[62ch] ${bodyColor}`}>{copy.body}</p>}
              </>
            )}
          </div>

          {moving && wake.since !== null && (
            <span
              aria-hidden="true"
              className={`col-start-2 row-start-2 -mt-2.5 md:col-start-3 md:row-start-1 md:mt-0 whitespace-nowrap text-sm font-bold tabular-nums ${bodyColor}`}
            >
              {formatElapsed(now - wake.since)}
            </span>
          )}

          {shown === "down" && (
            <button
              type="button"
              onClick={onRetry}
              className={`col-span-2 md:col-span-1 inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-[5px] bg-primary-default text-text font-lato font-bold text-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                dark
                  ? "focus-visible:ring-secondary-300 focus-visible:ring-offset-primary-700"
                  : "focus-visible:ring-secondary-500 focus-visible:ring-offset-primary-100"
              }`}
            >
              <RotateCw size={16} aria-hidden="true" />
              Try again
            </button>
          )}

          {moving && (
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden motion-reduce:hidden">
              <span className="absolute inset-y-0 w-[28%] rounded-full bg-primary-default motion-safe:animate-wake-sweep" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
