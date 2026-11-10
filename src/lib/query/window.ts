/**
 * The task window: quantized and rolling, in absolute instants (epoch ms ->
 * ISO UTC), so no timezone or midnight logic is involved.
 *
 * Today's callers send [now, now + 24h]. This window is
 * [bucketStart, bucketStart + 24h + 5min], where bucketStart <= now <
 * bucketStart + 5min. It is always a SUPERSET of today's window (by at most
 * 5 min on each side), so nothing the current code shows is ever hidden.
 */
export const BUCKET_MS = 5 * 60_000;
export const DAY_MS = 24 * 60 * 60_000;

export interface TaskWindow {
  start: string;
  end: string;
}

export const bucketOf = (nowMs: number): number => Math.floor(nowMs / BUCKET_MS);

export function windowFor(nowMs: number): TaskWindow {
  const start = bucketOf(nowMs) * BUCKET_MS;
  return {
    start: new Date(start).toISOString(),
    end: new Date(start + DAY_MS + BUCKET_MS).toISOString(),
  };
}

/** Milliseconds until the bucket (and therefore the window key) next changes. */
export function msUntilNextBucket(nowMs: number): number {
  return (bucketOf(nowMs) + 1) * BUCKET_MS - nowMs;
}
