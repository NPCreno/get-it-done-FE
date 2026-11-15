/** Injectable time: the fake backend never reads `Date.now()` itself. */
export interface Clock {
  now(): number;
}

export const DAY_MS = 24 * 60 * 60_000;
export const HOUR_MS = 60 * 60_000;

export const systemClock: Clock = { now: () => Date.now() };

export const fixedClock = (t: number): Clock => ({ now: () => t });

/** Start (00:00 UTC) of the UTC day containing `ms`. */
export const utcDay = (ms: number): number => Math.floor(ms / DAY_MS) * DAY_MS;

export const iso = (ms: number): string => new Date(ms).toISOString();

/** `YYYY-MM-DD` of the UTC day containing `ms`. */
export const dateOnly = (ms: number): string => iso(ms).slice(0, 10);
