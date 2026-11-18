"use client";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { addChatMember, deleteChatMessage, markChatRead, removeChatMember, sendChatMessage } from "@/app/api/chatRequests";
import type { ChatMessage, ChatRead, ChatUnread } from "@/app/contracts/responses";
import { addMessage, removeMessage, type ChatMessagePages } from "./chatCache";
import { clearUnread, NO_UNREAD, restoreUnread, selectUnread, unreadOf } from "./chatUnread";
import { chatInvalidationsFor, gatedInvalidate } from "./invalidation";
import { qk } from "./keys";
import { useSessionUserId } from "./queries";
import { chatMembersSpec, chatMessagesSpec, chatUnreadSpec, sharedProjectsSpec } from "./specs";
import { must, type ApiError } from "./unwrap";

export const CHAT_DATA_KEY = ["chatData"] as const;
/** Mark-read has its own key: its bursts gate only each other, never member or message edits. */
export const CHAT_READ_KEY = ["chatRead"] as const;

// -------------------------------------------------------------------- reads

export function useChatMembers(projectId: string | undefined, opts: { enabled?: boolean } = {}) {
  const id = useSessionUserId();
  return useQuery({
    ...chatMembersSpec(id ?? "", projectId ?? ""),
    enabled: !!id && !!projectId && opts.enabled !== false,
    staleTime: 30_000,
  });
}

export function useSharedProjects() {
  const id = useSessionUserId();
  return useQuery({ ...sharedProjectsSpec(id ?? ""), enabled: !!id, staleTime: 60_000 });
}

// ------------------------------------------------------- open chats (FEAT-08)

/**
 * Projects whose chat panel is open in this tab (ref-counted). Their badges read 0 while open:
 * a new message there is being read, so it must not raise the count even before the mark-read lands.
 */
const openCounts = new Map<string, number>();
const NONE_OPEN: ReadonlySet<string> = new Set();
let openSnapshot: ReadonlySet<string> = NONE_OPEN;
const openListeners = new Set<() => void>();

function changeOpen(projectId: string, delta: 1 | -1): void {
  const next = (openCounts.get(projectId) ?? 0) + delta;
  if (next > 0) openCounts.set(projectId, next);
  else openCounts.delete(projectId);
  openSnapshot = openCounts.size ? new Set(openCounts.keys()) : NONE_OPEN;
  openListeners.forEach((l) => l());
}

/** Registers an open chat panel; the returned function unregisters it. */
export function openChat(projectId: string): () => void {
  changeOpen(projectId, 1);
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    changeOpen(projectId, -1);
  };
}

function subscribeOpen(listener: () => void): () => void {
  openListeners.add(listener);
  return () => openListeners.delete(listener);
}

export function useOpenChats(): ReadonlySet<string> {
  return useSyncExternalStore(subscribeOpen, () => openSnapshot, () => NONE_OPEN);
}

export interface ChatUnreadView {
  /** Every chat's unread messages (open chats count 0). */
  total: number;
  countFor: (projectId: string) => number;
}

/** Pure: the counts as shown, with chats open in this tab at 0. */
export function unreadView(counts: typeof NO_UNREAD, open: ReadonlySet<string>): ChatUnreadView {
  let total = counts.total;
  for (const projectId of open) total -= counts.byProject[projectId] ?? 0;
  return {
    total: Math.max(0, total),
    countFor: (projectId) => (open.has(projectId) ? 0 : counts.byProject[projectId] ?? 0),
  };
}

/** FEAT-08 badges. `select` keeps the data referentially stable until a count changes. */
export function useChatUnread(): ChatUnreadView {
  const id = useSessionUserId();
  const query = useQuery({ ...chatUnreadSpec(id ?? ""), enabled: !!id, staleTime: 30_000, select: selectUnread });
  const counts = query.data ?? NO_UNREAD;
  const open = useOpenChats();
  return useMemo(() => unreadView(counts, open), [counts, open]);
}

/** The socket keeps it current (useChatRoom), so it never goes stale on its own. */
export function useChatMessages(projectId: string | undefined) {
  const id = useSessionUserId();
  return useInfiniteQuery({
    ...chatMessagesSpec(id ?? "", projectId ?? ""),
    enabled: !!id && !!projectId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------- mutations

/** Add a member by exact username (owner only). */
export function addMemberOptions(
  qc: QueryClient,
  userId: string,
  projectId: string
): UseMutationOptions<void, ApiError, string> {
  return {
    mutationKey: CHAT_DATA_KEY,
    mutationFn: async (username) => {
      must(await addChatMember(projectId, { username: username.trim() }));
    },
    onSettled: () => gatedInvalidate(qc, CHAT_DATA_KEY, chatInvalidationsFor("chat-members", userId, projectId)),
  };
}

/**
 * Remove a member (owner), or leave (a member passing their own id). Leaving
 * also drops the project's chat from this user's cache: they can no longer read it.
 */
export function removeMemberOptions(
  qc: QueryClient,
  userId: string,
  projectId: string
): UseMutationOptions<void, ApiError, string> {
  return {
    mutationKey: CHAT_DATA_KEY,
    mutationFn: async (memberId) => {
      must(await removeChatMember(projectId, memberId));
    },
    onSuccess: (_d, memberId) => {
      if (memberId === userId) {
        qc.removeQueries({ queryKey: qk.chatMessages(userId, projectId) });
        qc.removeQueries({ queryKey: qk.chatMembers(userId, projectId) });
      }
    },
    onSettled: (_d, _e, memberId) =>
      gatedInvalidate(
        qc,
        CHAT_DATA_KEY,
        chatInvalidationsFor(memberId === userId ? "chat-left" : "chat-members", userId, projectId)
      ),
  };
}

/** Not optimistic: the message appears once the server accepted it. */
export function sendMessageOptions(
  qc: QueryClient,
  userId: string,
  projectId: string
): UseMutationOptions<ChatMessage, ApiError, string> {
  return {
    mutationKey: CHAT_DATA_KEY,
    scope: { id: `chat:${projectId}` }, // keeps one composer's messages in order
    mutationFn: async (body) => must(await sendChatMessage(projectId, { body: body.trim() })).data,
    onSuccess: (message) => {
      qc.setQueryData<ChatMessagePages>(qk.chatMessages(userId, projectId), (d) => addMessage(d, message));
    },
    onSettled: () => gatedInvalidate(qc, CHAT_DATA_KEY, chatInvalidationsFor("chat-message", userId, projectId)),
  };
}

export function deleteMessageOptions(
  qc: QueryClient,
  userId: string,
  projectId: string
): UseMutationOptions<void, ApiError, string> {
  return {
    mutationKey: CHAT_DATA_KEY,
    mutationFn: async (messageId) => {
      must(await deleteChatMessage(projectId, messageId));
    },
    onSuccess: (_d, messageId) => {
      qc.setQueryData<ChatMessagePages>(qk.chatMessages(userId, projectId), (d) => removeMessage(d, messageId));
    },
    onSettled: () => gatedInvalidate(qc, CHAT_DATA_KEY, chatInvalidationsFor("chat-message", userId, projectId)),
  };
}

type MarkReadContext = { count: number };

/** Optimistic: the project's badge goes to 0 at once and comes back if the server refuses. */
export function markReadOptions(
  qc: QueryClient,
  userId: string,
  projectId: string
): UseMutationOptions<ChatRead, ApiError, string, MarkReadContext> {
  const key = qk.chatUnread(userId);
  return {
    mutationKey: CHAT_READ_KEY,
    mutationFn: async (messageId) => must(await markChatRead(projectId, messageId)).data,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });
      const count = unreadOf(qc.getQueryData<ChatUnread>(key), projectId);
      qc.setQueryData<ChatUnread>(key, (d) => clearUnread(d, projectId));
      return { count };
    },
    onError: (_e, _id, ctx) => {
      if (ctx) qc.setQueryData<ChatUnread>(key, (d) => restoreUnread(d, projectId, ctx.count));
    },
    onSettled: () => gatedInvalidate(qc, CHAT_READ_KEY, chatInvalidationsFor("chat-read", userId, projectId)),
  };
}

function useCtx() {
  const qc = useQueryClient();
  const userId = useSessionUserId() ?? "";
  return { qc, userId };
}

export function useAddChatMember(projectId: string) {
  const { qc, userId } = useCtx();
  return useMutation(addMemberOptions(qc, userId, projectId));
}

export function useRemoveChatMember(projectId: string) {
  const { qc, userId } = useCtx();
  return useMutation(removeMemberOptions(qc, userId, projectId));
}

export function useSendChatMessage(projectId: string) {
  const { qc, userId } = useCtx();
  return useMutation(sendMessageOptions(qc, userId, projectId));
}

export function useDeleteChatMessage(projectId: string) {
  const { qc, userId } = useCtx();
  return useMutation(deleteMessageOptions(qc, userId, projectId));
}

export function useMarkChatRead(projectId: string) {
  const { qc, userId } = useCtx();
  return useMutation(markReadOptions(qc, userId, projectId));
}

/** Wait this long after the last change before marking read (a burst of messages sends one call). */
export const MARK_READ_DEBOUNCE_MS = 500;

/**
 * While a chat panel is mounted: its badge reads 0, and while the tab is visible the read point
 * follows the newest loaded message (first load, each new message, the tab becoming visible).
 * Debounced; an id already sent from this panel is not sent again; no messages means no call.
 */
export function useMarkChatReadWhileOpen(projectId: string, newestMessageId: string | undefined): void {
  const { mutate } = useMarkChatRead(projectId);
  const sent = useRef<string | null>(null);

  useEffect(() => openChat(projectId), [projectId]);

  useEffect(() => {
    if (!newestMessageId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const due = () => document.visibilityState === "visible" && sent.current !== newestMessageId;
    const schedule = () => {
      clearTimeout(timer);
      if (!due()) return;
      timer = setTimeout(() => {
        if (!due()) return;
        sent.current = newestMessageId;
        mutate(newestMessageId, {
          // A failed mark is retried on the next change or visibility event.
          onError: () => {
            if (sent.current === newestMessageId) sent.current = null;
          },
        });
      }, MARK_READ_DEBOUNCE_MS);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [newestMessageId, mutate]);
}
