import type { MutationKey, QueryClient, QueryKey } from "@tanstack/react-query";
import { qk } from "./keys";

/** Every mutation names exactly what it invalidates, here and only here. */
export type DataEvent =
  | "task" // created, updated, deleted, recurring deleted, status set
  | "subtask-structure" // created or deleted
  | "subtask-status"
  | "project-saved" // created or updated
  | "project-deleted"
  | "profile";

export function invalidationsFor(event: DataEvent, userId: string): QueryKey[] {
  switch (event) {
    case "task":
    case "subtask-status":
      return [qk.tasks(userId), qk.analytics(userId), qk.projects(userId)];
    case "subtask-structure":
      return [qk.tasks(userId)];
    case "project-saved":
      return [qk.projects(userId), qk.analytics(userId)];
    case "project-deleted":
      return [qk.projects(userId), qk.tasks(userId), qk.analytics(userId)];
    case "profile":
      return [qk.profile(userId)];
  }
}

/** Resolves when every matching ACTIVE query has refetched (a failed refetch does not throw). */
export async function invalidateAll(qc: QueryClient, keys: QueryKey[]): Promise<void> {
  await Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

/**
 * Concurrent-burst gate: `isMutating` includes the settling mutation, so only
 * the LAST mutation of an overlapping burst invalidates. Returns the promise
 * so TanStack awaits it before the mutation settles (isPending covers it).
 */
export function gatedInvalidate(qc: QueryClient, mutationKey: MutationKey, keys: QueryKey[]): Promise<void> | undefined {
  return qc.isMutating({ mutationKey }) === 1 ? invalidateAll(qc, keys) : undefined;
}
