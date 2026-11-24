import type { QueryClient } from "@tanstack/react-query";
import { serverWake } from "../serverWake";

/**
 * UX-03: when the backend answers again, refetch every ACTIVE query that is in error. Queries
 * that are fine, inactive queries and mutations are left alone.
 */
export function refetchErroredQueries(client: QueryClient): Promise<void> {
  return client.refetchQueries({ type: "active", predicate: (q) => q.state.status === "error" });
}

/** Wires `serverWake.onAwake` to this client; returns the unsubscribe. */
export function connectServerWake(client: QueryClient): () => void {
  return serverWake.onAwake(() => {
    void refetchErroredQueries(client);
  });
}
