import { getActiveApiTransport } from "./apiTransport";

/**
 * UX-03: the one place that knows the backend is waking up (Render's free instance sleeps after
 * ~15 idle minutes and takes 30–60 s to start).
 *
 * `apiClient` reports a backend request that is still pending after `SLOW_MS` (`reportSlow`) or
 * that ended as `network`/`timeout` (`reportUnreachable`). While `waking`, this pings the backend's
 * `GET /` (no credentials, no auth header) until it answers 2xx, then goes back to `awake` and
 * calls the `onAwake` listeners once (the query layer refetches active queries in error).
 *
 * The core (`createServerWake`) is pure and takes its clock, timers and ping as dependencies;
 * `serverWake` below is the browser instance. Nothing happens while a demo transport is installed.
 */

export const SLOW_MS = 5_000;
export const PING_GAP_MS = 5_000;
export const PING_TIMEOUT_MS = 60_000;
export const GIVE_UP_MS = 3 * 60_000;
export const WARM_UP_GAP_MS = 10 * 60_000;

export type WakeState = "awake" | "waking";

export interface WakeSnapshot {
  state: WakeState;
  /** When the first slow request of this wake started; null while awake. */
  since: number | null;
  /** When the last wake ended with a 2xx; cleared by the next report. */
  wokeAt: number | null;
  /** True after GIVE_UP_MS without an answer; pings have stopped. */
  gaveUp: boolean;
}

export interface WakeDeps {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
  /** The health URL, or null when the API URL is missing or invalid (then nothing pings). */
  healthUrl: () => string | null;
  /** Resolves true only on a 2xx. Must never reject. */
  ping: (url: string, timeoutMs: number) => Promise<boolean>;
  /** True while a demo transport is installed: everything is a no-op. */
  isDisabled: () => boolean;
  /** Last warm-up time, kept per tab (survives a reload). */
  loadWarmUpAt?: () => number | null;
  saveWarmUpAt?: (at: number) => void;
}

export interface ServerWake {
  getSnapshot: () => WakeSnapshot;
  subscribe: (listener: () => void) => () => void;
  reportSlow: (startedAt: number) => void;
  reportUnreachable: () => void;
  /** Banner "Try again": restart the pings after a give-up. */
  retry: () => void;
  /** One fire-and-forget ping that never shows the banner. At most once per WARM_UP_GAP_MS. */
  warmUp: () => void;
  onAwake: (listener: () => void) => () => void;
}

export const AWAKE_SNAPSHOT: WakeSnapshot = Object.freeze({
  state: "awake",
  since: null,
  wokeAt: null,
  gaveUp: false,
}) as WakeSnapshot;

/**
 * `https://x.onrender.com/api` → `https://x.onrender.com/`. Null for a missing value or anything
 * that is not an absolute http(s) URL.
 */
export function healthUrlFrom(apiUrl: string | undefined | null): string | null {
  if (!apiUrl) return null;
  try {
    const u = new URL(apiUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return `${u.origin}/`;
  } catch {
    return null;
  }
}

export function createServerWake(deps: WakeDeps): ServerWake {
  let snap: WakeSnapshot = AWAKE_SNAPSHOT;
  const listeners = new Set<() => void>();
  const awakeListeners = new Set<() => void>();
  let inFlight = false;
  let pingTimer: unknown = null;
  let giveUpTimer: unknown = null;
  let lastWarmUpAt: number | null = null;

  const set = (next: Partial<WakeSnapshot>) => {
    snap = { ...snap, ...next };
    listeners.forEach((l) => l());
  };

  const clearPingTimer = () => {
    if (pingTimer !== null) deps.clearTimeout(pingTimer);
    pingTimer = null;
  };
  const clearGiveUpTimer = () => {
    if (giveUpTimer !== null) deps.clearTimeout(giveUpTimer);
    giveUpTimer = null;
  };

  const pinging = () => snap.state === "waking" && !snap.gaveUp;

  const wake = () => {
    clearPingTimer();
    clearGiveUpTimer();
    set({ state: "awake", since: null, gaveUp: false, wokeAt: deps.now() });
    awakeListeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.error("[serverWake] onAwake listener failed", e);
      }
    });
  };

  const ping = () => {
    if (inFlight) return; // one ping at a time; its result continues the loop
    const url = deps.healthUrl();
    if (!url) return;
    inFlight = true;
    void deps.ping(url, PING_TIMEOUT_MS).then(
      (ok) => afterPing(ok),
      () => afterPing(false)
    );
  };

  function afterPing(ok: boolean) {
    inFlight = false;
    if (snap.state !== "waking") return; // a warm-up while awake changes nothing
    // A late 2xx still ends the wake, even after a give-up: the server did answer.
    if (ok) return wake();
    if (!pinging()) return;
    clearPingTimer();
    pingTimer = deps.setTimeout(() => {
      pingTimer = null;
      ping();
    }, PING_GAP_MS);
  }

  const startGiveUpTimer = (since: number) => {
    clearGiveUpTimer();
    giveUpTimer = deps.setTimeout(() => {
      giveUpTimer = null;
      if (snap.state !== "waking") return;
      clearPingTimer();
      set({ gaveUp: true });
    }, Math.max(0, since + GIVE_UP_MS - deps.now()));
  };

  const report = (at: number) => {
    if (deps.isDisabled() || !deps.healthUrl()) return;
    // `since` stays the first report's; a give-up stays until Try again.
    if (snap.state === "waking") return;
    set({ state: "waking", since: at, wokeAt: null, gaveUp: false });
    startGiveUpTimer(at);
    ping();
  };

  return {
    getSnapshot: () => snap,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reportSlow: (startedAt) => report(Number.isFinite(startedAt) ? startedAt : deps.now()),
    reportUnreachable: () => report(deps.now()),
    retry: () => {
      if (deps.isDisabled() || !deps.healthUrl()) return;
      const now = deps.now();
      set({ state: "waking", since: now, wokeAt: null, gaveUp: false });
      startGiveUpTimer(now);
      clearPingTimer();
      ping();
    },
    warmUp: () => {
      if (deps.isDisabled() || !deps.healthUrl()) return;
      const now = deps.now();
      const last = deps.loadWarmUpAt ? deps.loadWarmUpAt() : lastWarmUpAt;
      if (last !== null && now - last >= 0 && now - last < WARM_UP_GAP_MS) return;
      lastWarmUpAt = now;
      deps.saveWarmUpAt?.(now);
      ping();
    },
    onAwake: (listener) => {
      awakeListeners.add(listener);
      return () => awakeListeners.delete(listener);
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Browser instance

const WARM_UP_KEY = "gid-warmup-at";

function sessionStore(): Storage | null {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : null;
  } catch {
    return null; // storage blocked
  }
}

async function browserPing(url: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // A simple GET: no cookies, no Authorization header, so no preflight and nothing to leak.
    const res = await fetch(url, { method: "GET", cache: "no-store", credentials: "omit", signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

let browserInstance: ServerWake | null = null;

function instance(): ServerWake {
  if (browserInstance) return browserInstance;
  browserInstance = createServerWake({
    now: () => Date.now(),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    healthUrl: () => (typeof window === "undefined" ? null : healthUrlFrom(process.env.NEXT_PUBLIC_API_URL)),
    ping: browserPing,
    isDisabled: () => getActiveApiTransport() !== null,
    loadWarmUpAt: () => {
      const raw = sessionStore()?.getItem(WARM_UP_KEY);
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : null;
    },
    saveWarmUpAt: (at) => {
      try {
        sessionStore()?.setItem(WARM_UP_KEY, String(at));
      } catch {
        // storage full or blocked: the warm-up just runs again on the next load
      }
    },
  });
  return browserInstance;
}

/** The per-tab instance. Methods are stable (safe for `useSyncExternalStore`). */
export const serverWake: ServerWake = {
  getSnapshot: () => (browserInstance ? browserInstance.getSnapshot() : AWAKE_SNAPSHOT),
  subscribe: (l) => instance().subscribe(l),
  reportSlow: (startedAt) => instance().reportSlow(startedAt),
  reportUnreachable: () => instance().reportUnreachable(),
  retry: () => instance().retry(),
  warmUp: () => instance().warmUp(),
  onAwake: (l) => instance().onAwake(l),
};
