import { apiClient } from "@/lib/apiClient";
import { LIMITS } from "../contracts/common";
import { AddChatMemberRequestSchema, MarkChatReadRequestSchema, SendChatMessageRequestSchema } from "../contracts/requests";
import type { AddChatMemberRequest, SendChatMessageRequest } from "../contracts/requests";
import {
  ChatMembersSchema,
  ChatMessageSchema,
  ChatMessagesPageSchema,
  ChatReadSchema,
  ChatUnreadSchema,
  SharedProjectSchema,
} from "../contracts/responses";
import {
  chatMemberPath,
  chatMembersPath,
  chatMessagePath,
  chatMessagesPath,
  chatReadPath,
  chatSharedProjectsPath,
  chatUnreadPath,
} from "./paths";

// FEAT-05 project chat. Every route takes the caller from the token; the backend
// answers a non-member with the same 404 as a missing project.

export const CHAT_MESSAGES_PAGE_SIZE = 50;
if (CHAT_MESSAGES_PAGE_SIZE > LIMITS.chatMessagesPageMax) throw new Error("page size exceeds the contract maximum");

type Opts = { signal?: AbortSignal };

/** The owner plus every member. */
export const getChatMembers = (projectId: string, opts?: Opts) =>
  apiClient(chatMembersPath(projectId), {
    schema: ChatMembersSchema,
    signal: opts?.signal,
    fallbackError: "Failed to load members",
  });

/** Owner only. Exact username. */
export const addChatMember = (projectId: string, body: AddChatMemberRequest) =>
  apiClient(chatMembersPath(projectId), {
    method: "POST",
    body,
    requestSchema: AddChatMemberRequestSchema,
    expect: "none",
    fallbackError: "Failed to add member",
  });

/** The owner removing a member, or a member leaving (their own id). */
export const removeChatMember = (projectId: string, userId: string) =>
  apiClient(chatMemberPath(projectId, userId), {
    method: "DELETE",
    expect: "none",
    fallbackError: "Failed to remove member",
  });

export const getSharedProjects = (opts?: Opts) =>
  apiClient(chatSharedProjectsPath(), {
    schema: SharedProjectSchema.array(),
    signal: opts?.signal,
    fallbackError: "Failed to load shared projects",
  });

/** FEAT-08: unread chat messages per project (only projects with any) and the total. */
export const getChatUnread = (opts?: Opts) =>
  apiClient(chatUnreadPath(), {
    schema: ChatUnreadSchema,
    signal: opts?.signal,
    fallbackError: "Failed to load unread messages",
  });

/** FEAT-08: moves this user's read point up to `messageId`. Idempotent; never moves back. */
export const markChatRead = (projectId: string, messageId: string) =>
  apiClient(chatReadPath(projectId), {
    method: "PUT",
    body: { message_id: messageId },
    requestSchema: MarkChatReadRequestSchema,
    schema: ChatReadSchema,
    fallbackError: "Failed to mark messages read",
  });

/** Newest first. `cursor` is opaque: pass back exactly what the previous page returned. */
export const getChatMessagesPage = (projectId: string, cursor: string | undefined, opts?: Opts) =>
  apiClient(chatMessagesPath(projectId), {
    query: { limit: CHAT_MESSAGES_PAGE_SIZE, cursor },
    schema: ChatMessagesPageSchema,
    signal: opts?.signal,
    fallbackError: "Failed to load messages",
  });

export const sendChatMessage = (projectId: string, body: SendChatMessageRequest) =>
  apiClient(chatMessagesPath(projectId), {
    method: "POST",
    body,
    requestSchema: SendChatMessageRequestSchema,
    schema: ChatMessageSchema,
    fallbackError: "Failed to send message",
  });

/** The author, or the project owner. */
export const deleteChatMessage = (projectId: string, messageId: string) =>
  apiClient(chatMessagePath(projectId, messageId), {
    method: "DELETE",
    expect: "none",
    fallbackError: "Failed to delete message",
  });
