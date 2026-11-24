import type { ApiFailureKind } from "./apiClient";
import { getActiveApiTransport } from "./apiTransport";
import type { WakeSnapshot } from "./serverWake";

/** UX-03 view rules for the wake banner and the waiting cards. Pure (the demo check aside). */

/** From the first slow request: A ("waking") before this, B ("longer") from it. */
export const LONGER_MS = 45_000;
/** After a wake, a refetching card keeps its waiting look for this long (no red flash). */
export const RECENT_WAKE_MS = 15_000;
/** The banner's green "awake" state stays this long, then folds away. */
export const AWAKE_HOLD_MS = 1_200;

export type BannerPhase = "hidden" | "waking" | "longer" | "down";

export function bannerPhase({
  state,
  gaveUp,
  since,
  now,
}: Pick<WakeSnapshot, "state" | "gaveUp" | "since"> & { now: number }): BannerPhase {
  if (state !== "waking") return "hidden";
  if (gaveUp) return "down";
  const elapsed = since === null ? 0 : now - since;
  return elapsed >= LONGER_MS ? "longer" : "waking";
}

/** `m:ss`; negative or non-finite input is `0:00`. */
export function formatElapsed(ms: number): string {
  const total = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * True when a load failure should show the waiting skeleton instead of `LoadError`: the
 * failure is `network`/`timeout` AND either the server is waking (not given up), or this is the
 * refetch right after a wake (so cards don't flash red while the banner shows "awake").
 */
export function showWaitingForServer(
  failureKind: ApiFailureKind,
  wake: Pick<WakeSnapshot, "state" | "gaveUp" | "wokeAt">,
  retrying: boolean,
  now: number
): boolean {
  if (failureKind !== "network" && failureKind !== "timeout") return false;
  if (getActiveApiTransport() !== null) return false;
  if (wake.state === "waking") return !wake.gaveUp;
  return retrying && wake.wokeAt !== null && now - wake.wokeAt >= 0 && now - wake.wokeAt < RECENT_WAKE_MS;
}
