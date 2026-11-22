"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getAccessToken } from "@/app/utils/utils";
import { refreshSession } from "./clientSession";
import { createNotificationStream, type NotificationStream } from "./notificationStream";
import { invalidateUnlessMutating, tasksInvalidationsFor } from "./query/invalidation";
import { qk } from "./query/keys";
import { TASK_DATA_KEY } from "./query/mutations";
import { useSessionUserId } from "./query/queries";

let shared: NotificationStream | null = null;

/** One connection per tab, shared by every subscriber. */
function stream(): NotificationStream {
  if (!shared) {
    shared = createNotificationStream({
      fetch: (...args) => fetch(...args),
      baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
      getToken: getAccessToken,
      refresh: refreshSession,
      sleep: (ms, signal) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, ms);
          signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(new Error("aborted"));
            },
            { once: true }
          );
        }),
      random: Math.random,
      now: Date.now,
    });
  }
  return shared;
}

/**
 * Mount once (MainLayout). A `notification` event refetches the notifications list; a `chat`
 * event refetches the unread chat counts (FEAT-08); a `tasks` event refetches that project's tasks,
 * my task board and the dashboard (FEAT-09), unless a task mutation of mine is in flight. A
 * reconnect refetches the lists and counts, and the task data too (events may have been missed);
 * the first connect after mounting does not, since the page has just loaded it.
 */
export function useNotificationStream(): void {
  const qc = useQueryClient();
  const userId = useSessionUserId();
  useEffect(() => {
    if (!userId || !process.env.NEXT_PUBLIC_API_URL) return;
    const s = stream();
    const refetch = () => void qc.invalidateQueries({ queryKey: qk.notifications(userId) });
    const refetchChat = () => void qc.invalidateQueries({ queryKey: qk.chatUnread(userId) });
    let connectedBefore = false;
    const unsubscribe = s.subscribe({
      onNotification: refetch,
      onChat: refetchChat,
      onTasks: (projectId) => void invalidateUnlessMutating(qc, TASK_DATA_KEY, tasksInvalidationsFor(userId, projectId)),
      onConnected: () => {
        refetch();
        refetchChat();
        if (connectedBefore) void invalidateUnlessMutating(qc, TASK_DATA_KEY, [qk.tasks(userId), qk.analytics(userId)]);
        connectedBefore = true;
      },
    });
    const onVisibility = () => s.setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    s.setHidden(document.hidden);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      unsubscribe();
    };
  }, [qc, userId]);
}
