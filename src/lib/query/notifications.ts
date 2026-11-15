"use client";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";
import { clearNotifications, getNotificationsPage, markAllNotificationsRead, markNotificationRead } from "@/app/api/notificationsRequests";
import { dataMutationOptions } from "./mutations";
import { gatedInvalidate, invalidationsFor } from "./invalidation";
import { qk } from "./keys";
import { applyRead, revertRead, type NotificationPages } from "./notificationsOptimistic";
import { useSessionUserId } from "./queries";
import { must, unwrap, type ApiError } from "./unwrap";

export const NOTIFICATION_DATA_KEY = ["notificationData"] as const;

type Ctx = { signal: AbortSignal; pageParam: string | undefined };

/** The key equals the request parameters; the cursor is the page param. */
export const notificationsSpec = (id: string) => ({
  queryKey: qk.notifications(id),
  queryFn: async ({ signal, pageParam }: Ctx) => unwrap(await getNotificationsPage(pageParam, { signal })),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last: { next_cursor: string | null }) => last.next_cursor ?? undefined,
});

export function useNotifications() {
  const id = useSessionUserId();
  return useInfiniteQuery({ ...notificationsSpec(id ?? ""), enabled: !!id, staleTime: 30_000 });
}

/** Shares the list's cache entry; the count comes from the first page. */
export function useUnreadCount(): number {
  const id = useSessionUserId();
  const q = useInfiniteQuery({
    ...notificationsSpec(id ?? ""),
    enabled: !!id,
    staleTime: 30_000,
    select: (d) => d.pages[0]?.unread_count ?? 0,
  });
  return q.data ?? 0;
}

/** Optimistic for the single row and the count, with per-row rollback. */
export function markReadOptions(
  qc: QueryClient,
  userId: string
): UseMutationOptions<void, ApiError, string, { id: string }> {
  return {
    mutationKey: NOTIFICATION_DATA_KEY,
    mutationFn: async (id) => {
      must(await markNotificationRead(id));
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.notifications(userId) });
      qc.setQueryData<NotificationPages>(qk.notifications(userId), (d) => applyRead(d, id));
      return { id };
    },
    onError: (_e, _id, ctx) => {
      if (ctx) qc.setQueryData<NotificationPages>(qk.notifications(userId), (d) => revertRead(d, ctx.id));
    },
    onSettled: () => gatedInvalidate(qc, NOTIFICATION_DATA_KEY, invalidationsFor("notifications", userId)),
  };
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  const userId = useSessionUserId() ?? "";
  return useMutation(markReadOptions(qc, userId));
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  const userId = useSessionUserId() ?? "";
  return useMutation(
    dataMutationOptions(qc, userId, NOTIFICATION_DATA_KEY, "notifications", () => markAllNotificationsRead())
  );
}

export function useClearNotifications() {
  const qc = useQueryClient();
  const userId = useSessionUserId() ?? "";
  return useMutation(
    dataMutationOptions(qc, userId, NOTIFICATION_DATA_KEY, "notifications", () => clearNotifications(userId))
  );
}
