"use client";
import { useEffect, useState } from "react";

/** `Date.now()`, refreshed every `everyMs` while `running` (no interval otherwise). */
export function useTicker(running: boolean, everyMs = 1_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [running, everyMs]);
  return now;
}

/**
 * Runs `cb` once, on the next animation frame or after `fallbackMs`, whichever comes first.
 * A hidden tab pauses animation frames; the timeout still runs there. Returns a cancel.
 */
export function onNextFrame(cb: () => void, fallbackMs = 100): () => void {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    cb();
  };
  const raf = requestAnimationFrame(run);
  const timer = setTimeout(run, fallbackMs);
  return () => {
    done = true;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
  };
}

/**
 * True one animation frame after `active` turns true, false as soon as it turns false. A live
 * region that is mounted empty and filled a frame later is announced reliably; one inserted
 * together with its text often is not.
 */
export function useNextFrame(active: boolean): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!active) {
      setReady(false);
      return;
    }
    return onNextFrame(() => setReady(true));
  }, [active]);
  return active && ready;
}
