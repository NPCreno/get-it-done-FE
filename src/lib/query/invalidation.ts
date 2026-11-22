import type { MutationKey, QueryClient, QueryKey } from "@tanstack/react-query";
import { qk } from "./keys";

/** Every mutation names exactly what it invalidates, here and only here. */
export type DataEvent =
  | "task" // created, updated, deleted, recurring deleted, status set
  | "subtask-structure" // created or deleted
  | "subtask-status"
  | "project-saved" // created or updated
  | "project-deleted"
  | "profile"
  | "notifications" // read state changed, or cleared
  | "api-tokens" // created or revoked (FEAT-07)
  | "oauth-grants"; // an app connected (consent allowed) or disconnected (FEAT-07d)

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
    case "notifications":
      return [qk.notifications(userId)];
    case "api-tokens":
      return [qk.apiTokens(userId)];
    case "oauth-grants":
      return [qk.oauthGrants(userId)];
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

/** FEAT-05 chat events. They name a project, so they have their own table. */
export type ChatDataEvent =
  | "chat-members" // added or removed by the owner
  | "chat-left" // this user left the project
  | "chat-message" // sent or deleted
  | "chat-read"; // this user's read point moved (FEAT-08)

export function chatInvalidationsFor(event: ChatDataEvent, userId: string, projectId: string): QueryKey[] {
  switch (event) {
    case "chat-members":
      return [qk.chatMembers(userId, projectId), qk.sharedProjects(userId)];
    case "chat-left":
      // That chat's badge goes too.
      return [qk.sharedProjects(userId), qk.chatUnread(userId)];
    case "chat-read":
      return [qk.chatUnread(userId)];
    case "chat-message":
      // Nothing: the mutation writes its own response into the cache and the socket
      // delivers everyone else's. A refetch would reload every loaded page of history.
      return [];
  }
}

/**
 * FEAT-09: what a change to a task in one project refreshes: that project's task list, my task
 * board and the dashboard widgets. Used by the assignee mutation and by the `tasks` SSE event.
 */
export function tasksInvalidationsFor(userId: string, projectId: string): QueryKey[] {
  return [qk.projectTasksOf(userId, projectId), qk.upcomingAll(userId), qk.analytics(userId)];
}

/**
 * For changes made by someone else (the SSE `tasks` event): invalidate now unless one of my own
 * mutations with this key is in flight. That mutation's settle invalidates (a superset) when it
 * ends, so nothing is lost, and its optimistic state is not overwritten by a mid-flight refetch.
 */
export function invalidateUnlessMutating(
  qc: QueryClient,
  mutationKey: MutationKey,
  keys: QueryKey[]
): Promise<void> | undefined {
  return qc.isMutating({ mutationKey }) === 0 ? invalidateAll(qc, keys) : undefined;
}
