import { QueryCache, QueryClient } from "@tanstack/react-query";
import { resourceOf } from "./keys";
import { failureOf, isCancellation, isRetryable } from "./unwrap";

let current: QueryClient | null = null;

export function createQueryClient(): QueryClient {
  const client = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // A cancelled request is not an error worth reporting.
        if (isCancellation(error)) return;
        const f = failureOf(error);
        console.warn("[query]", resourceOf(query.queryKey), f.kind, f.status);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        // One retry, only for network/timeout; never for cancellations or http errors.
        retry: (failureCount, error) => isRetryable(error) && failureCount < 1,
      },
      mutations: { retry: 0 },
    },
  });
  return client;
}

/** The provider registers its client so non-React code (session expiry) can clear it. */
export function registerQueryClient(client: QueryClient): void {
  current = client;
}

/** Drop every cached query: call before a full navigation that ends a session. */
export function clearQueryCache(): void {
  current?.clear();
}
