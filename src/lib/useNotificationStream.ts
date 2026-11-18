"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getAccessToken } from "@/app/utils/utils";
import { refreshSession } from "./clientSession";
import { createNotificationStream, type NotificationStream } from "./notificationStream";
import { qk } from "./query/keys";
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
 * event refetches the unread chat counts (FEAT-08); a reconnect refetches both.
 */
export function useNotificationStream(): void {
  const qc = useQueryClient();
  const userId = useSessionUserId();
  useEffect(() => {
    if (!userId || !process.env.NEXT_PUBLIC_API_URL) return;
    const s = stream();
    const refetch = () => void qc.invalidateQueries({ queryKey: qk.notifications(userId) });
    const refetchChat = () => void qc.invalidateQueries({ queryKey: qk.chatUnread(userId) });
    const unsubscribe = s.subscribe({
      onNotification: refetch,
      onChat: refetchChat,
      onConnected: () => {
        refetch();
        refetchChat();
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
