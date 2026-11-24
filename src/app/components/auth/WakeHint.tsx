"use client";
import { useEffect, useState } from "react";
import { SLOW_MS } from "@/lib/serverWake";
import { formatElapsed } from "@/lib/serverWakeView";
import { useNextFrame, useTicker } from "@/lib/useTicker";
import WakeIcon from "../WakeIcon";

/**
 * UX-03: under a disabled login/signup button, once the submit has been pending for SLOW_MS.
 * Stays until the request ends. Only the text is a live region; the timer is `aria-hidden`.
 */
export default function WakeHint({ pending, dark = false }: { pending: boolean; dark?: boolean }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  useEffect(() => {
    setStartedAt(pending ? Date.now() : null);
  }, [pending]);
  const now = useTicker(pending);
  const elapsed = startedAt === null ? 0 : now - startedAt;
  const slow = pending && startedAt !== null && elapsed >= SLOW_MS;
  const textReady = useNextFrame(slow);

  if (!slow) return null;
  return (
    <div
      data-wake-hint
      className={`grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[10px] border px-3 py-2.5 font-lato ${
        dark ? "bg-primary-700 border-primary-600" : "bg-primary-100 border-primary-200"
      }`}
    >
      <WakeIcon dark={dark} moving small />
      <p role="status" className={`text-sm text-left ${dark ? "text-white" : "text-text"}`}>
        {textReady ? "Waking up the server. This can take up to a minute." : ""}
      </p>
      <span aria-hidden="true" className={`text-sm font-bold tabular-nums ${dark ? "text-primary-200" : "text-primary-600"}`}>
        {formatElapsed(elapsed)}
      </span>
    </div>
  );
}
