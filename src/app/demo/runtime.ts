import type { QueryClient } from "@tanstack/react-query";
import { installApiTransport } from "@/lib/apiTransport";
import { createQueryClient } from "@/lib/query/client";
import { createDemoTransport, type DemoTransport, type DemoTransportOptions } from "./fake/router";
import { buildSeed } from "./fake/seed";
import { createDemoStore, type DemoStore } from "./fake/store";
import type { Clock } from "./fake/clock";

/**
 * Framework-free demo runtime: an in-memory fake backend, the transport that serves it and a
 * private QueryClient. The QueryClient is created with the production factory but is NEVER
 * passed to `registerQueryClient`, so session expiry can never clear it and it never touches the
 * real session's cache.
 */
export interface DemoRuntime {
  /** The CURRENT store (a reset or a re-armed start swaps it). */
  readonly store: DemoStore;
  readonly transport: DemoTransport;
  readonly queryClient: QueryClient;
  /** Installs the transport. Idempotent. Re-arms (with a fresh store) after `stop()`. */
  start(): void;
  /** cancelQueries, retire the store, clear the client, release the transport last. Idempotent. */
  stop(): void;
  /** cancelQueries, swap in a fresh seed, resetQueries. In-flight work lands on the old store. */
  reset(): Promise<void>;
}

export interface DemoRuntimeOptions extends DemoTransportOptions {
  clock: Clock;
}

export function createDemoRuntime({ clock, ...transportOptions }: DemoRuntimeOptions): DemoRuntime {
  let store = createDemoStore(buildSeed(clock));
  const queryClient = createQueryClient();
  const transport = createDemoTransport(() => store, clock, transportOptions);
  let release: (() => void) | null = null;

  return {
    get store() {
      return store;
    },
    transport,
    queryClient,
    start() {
      if (release) return;
      if (store.retired) store = createDemoStore(buildSeed(clock), store.generation + 1);
      release = installApiTransport(transport);
    },
    stop() {
      if (!release) return;
      void queryClient.cancelQueries();
      store.retire();
      queryClient.clear();
      const done = release;
      release = null;
      done(); // last
    },
    async reset() {
      await queryClient.cancelQueries();
      store = createDemoStore(buildSeed(clock), store.generation + 1);
      await queryClient.resetQueries();
    },
  };
}
