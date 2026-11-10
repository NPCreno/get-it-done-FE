import { QueryClient } from "@tanstack/react-query";
import { createQueryClient } from "../client";

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Let queued microtasks and zero-delay timers run. */
export const flush = () => new Promise<void>((r) => setTimeout(r, 0));

/** The production client (real defaults), with retry delays removed so tests do not wait. */
export function testClient(): QueryClient {
  const qc = createQueryClient();
  qc.setDefaultOptions({
    ...qc.getDefaultOptions(),
    queries: { ...qc.getDefaultOptions().queries, retryDelay: 0 },
  });
  return qc;
}

export const okResult = <T>(data: T) => ({ ok: true as const, status: 200, data });
export const failResult = (kind: "http" | "network" | "timeout" | "aborted" = "http") => ({
  ok: false as const,
  status: kind === "http" ? 500 : 0,
  kind,
  message: `${kind} failure`,
});
