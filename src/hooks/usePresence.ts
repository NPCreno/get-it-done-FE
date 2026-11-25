"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { AnimationEvent } from "react";
import { createPresence, nextFirstLoad, nextPageIn, PAGE_IN_MAX_MS } from "./presence";
import type { PageInPhase, Presence, PresenceState } from "./presence";

/**
 * `{ mounted, leaving }` for an element that animates out: when `show` turns false it stays
 * mounted and `leaving` for `exitMs`, then unmounts. Showing it again cancels the exit.
 */
export function usePresence(show: boolean, exitMs = 100): PresenceState {
  const ref = useRef<Presence | null>(null);
  if (ref.current === null) ref.current = createPresence({ show, exitMs });
  const presence = ref.current;
  useEffect(() => {
    presence.set(show);
  }, [presence, show]);
  useEffect(() => () => presence.dispose(), [presence]);
  return useSyncExternalStore(presence.subscribe, presence.getSnapshot, presence.getSnapshot);
}

/**
 * True until `loading` is false once, then false for good: the full-page loader is for a page's
 * first load only. Starts with the first `loading` value, so cached data shows the page at once.
 */
export function useFirstLoad(loading: boolean): boolean {
  const [firstLoad, setFirstLoad] = useState(loading);
  const next = nextFirstLoad(firstLoad, loading);
  if (next !== firstLoad) setFirstLoad(next); // derived state, set during render
  return next;
}

/**
 * The view root's page-in animation (UX-04): on from the moment the loader starts leaving until
 * the root's own `animationend` (or `PAGE_IN_MAX_MS`), and never again on this visit. Pages shown
 * without a loader never get it. Put `PAGE_IN_CLASS` (from `loaderClasses`) on the root while
 * `active`.
 */
export function usePageIn(loaderLeaving: boolean) {
  const [phase, setPhase] = useState<PageInPhase>("idle");
  const next = nextPageIn(phase, loaderLeaving);
  if (next !== phase) setPhase(next);

  useEffect(() => {
    if (next !== "running") return;
    const timer = setTimeout(() => setPhase("done"), PAGE_IN_MAX_MS);
    return () => clearTimeout(timer);
  }, [next]);

  return {
    active: next === "running",
    // Children's own animations bubble here too; only the root's own end counts.
    onAnimationEnd: (e: AnimationEvent<HTMLElement>) => {
      if (e.target === e.currentTarget) setPhase("done");
    },
  };
}
