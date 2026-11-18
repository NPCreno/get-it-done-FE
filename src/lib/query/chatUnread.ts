import type { ChatUnread } from "@/app/contracts/responses";

/**
 * FEAT-08 pure helpers for the unread-chat cache. The server's `GET /chat/unread` stays the
 * source of truth: these only shape it for the UI and apply the optimistic mark-read.
 */

/** What components read: a total and a lookup by project, stable while the counts are unchanged. */
export interface UnreadCounts {
  total: number;
  byProject: Readonly<Record<string, number>>;
}

export const NO_UNREAD: UnreadCounts = Object.freeze({ total: 0, byProject: Object.freeze({}) });

/** `select` for the query. Module-level, so TanStack memoizes it. */
export function selectUnread(data: ChatUnread): UnreadCounts {
  const byProject: Record<string, number> = {};
  for (const item of data.items) if (item.unread_count > 0) byProject[item.project_id] = item.unread_count;
  return { total: data.total, byProject };
}

/** Badge text: nothing at 0, then 1-99, then "99+". */
export function formatUnread(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  return n > 99 ? "99+" : String(Math.floor(n));
}

/** The accessible name of a chat badge. */
export function unreadLabel(n: number): string {
  const shown = n > 99 ? "more than 99" : String(n);
  return `${shown} unread chat message${n === 1 ? "" : "s"}`;
}

/** The project's count in the cache (0 when not listed). */
export function unreadOf(data: ChatUnread | undefined, projectId: string): number {
  return data?.items.find((i) => i.project_id === projectId)?.unread_count ?? 0;
}

/** Optimistic mark-read: that project goes to 0 (drops out of `items`) and `total` falls to match. */
export function clearUnread(data: ChatUnread | undefined, projectId: string): ChatUnread | undefined {
  if (!data) return data;
  const count = unreadOf(data, projectId);
  if (count === 0) return data;
  return {
    items: data.items.filter((i) => i.project_id !== projectId),
    total: Math.max(0, data.total - count),
  };
}

/**
 * Rollback after a failed mark-read. Compare-and-swap: restores `count` only if the project is
 * still at the 0 we set; a newer server value (a refetch landed meanwhile) wins.
 */
export function restoreUnread(data: ChatUnread | undefined, projectId: string, count: number): ChatUnread | undefined {
  if (!data || count <= 0 || unreadOf(data, projectId) !== 0) return data;
  return {
    items: [...data.items, { project_id: projectId, unread_count: count }],
    total: data.total + count,
  };
}
