"use client";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";
import { addChatMember, deleteChatMessage, removeChatMember, sendChatMessage } from "@/app/api/chatRequests";
import type { ChatMessage } from "@/app/contracts/responses";
import { addMessage, removeMessage, type ChatMessagePages } from "./chatCache";
import { chatInvalidationsFor, gatedInvalidate } from "./invalidation";
import { qk } from "./keys";
import { useSessionUserId } from "./queries";
import { chatMembersSpec, chatMessagesSpec, sharedProjectsSpec } from "./specs";
import { must, type ApiError } from "./unwrap";

export const CHAT_DATA_KEY = ["chatData"] as const;

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
        memberId === userId
          ? [qk.sharedProjects(userId)]
          : chatInvalidationsFor("chat-members", userId, projectId)
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
