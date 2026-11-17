"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getAccessToken } from "@/app/utils/utils";
import { chatSocketUrl, createChatSocket, type ChatSocket } from "./chatSocket";
import { refreshSession } from "./clientSession";
import { addMessage, removeMessage, type ChatMessagePages } from "./query/chatCache";
import { qk } from "./query/keys";
import { useSessionUserId } from "./query/queries";

let shared: ChatSocket | null = null;
let visibilityBound = false;

/** One socket per tab, shared by every open chat. Null when the API URL is unusable. */
function chatSocket(): ChatSocket | null {
  if (shared) return shared;
  const url = chatSocketUrl(process.env.NEXT_PUBLIC_API_URL ?? "");
  if (!url || typeof WebSocket === "undefined") return null;
  shared = createChatSocket({
    url,
    createSocket: (target, events) => {
      const ws = new WebSocket(target);
      ws.onopen = () => events.open();
      ws.onmessage = (e) => events.message(e.data);
      ws.onclose = (e) => events.close(e.code);
      return { send: (data) => ws.send(data), close: (code) => ws.close(code) };
    },
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
  if (!visibilityBound && typeof document !== "undefined") {
    visibilityBound = true;
    const s = shared;
    document.addEventListener("visibilitychange", () => s.setHidden(document.hidden));
    s.setHidden(document.hidden);
  }
  return shared;
}

/**
 * Keeps one project's message cache live while mounted. An event patches the
 * cache directly (no refetch); a (re)connect refetches to recover anything missed.
 * Returns true once the server says this user is no longer in the project.
 */
export function useChatRoom(projectId: string | undefined): { removed: boolean } {
  const qc = useQueryClient();
  const userId = useSessionUserId();
  const [removedFrom, setRemovedFrom] = useState<string | null>(null);
  useEffect(() => {
    if (!userId || !projectId) return;
    const socket = chatSocket();
    if (!socket) return;
    const key = qk.chatMessages(userId, projectId);
    const leave = socket.join(projectId, {
      onCreated: (message) => qc.setQueryData<ChatMessagePages>(key, (d) => addMessage(d, message)),
      onDeleted: (id) => qc.setQueryData<ChatMessagePages>(key, (d) => removeMessage(d, id)),
      onResync: () => void qc.invalidateQueries({ queryKey: key }),
      onRemoved: () => {
        setRemovedFrom(projectId);
        void qc.invalidateQueries({ queryKey: qk.sharedProjects(userId) });
      },
    });
    return () => {
      leave();
      // Not in the room any more, so events are missed from now on: the next open refetches.
      void qc.invalidateQueries({ queryKey: key, refetchType: "none" });
    };
  }, [qc, userId, projectId]);
  return { removed: !!projectId && removedFrom === projectId };
}
