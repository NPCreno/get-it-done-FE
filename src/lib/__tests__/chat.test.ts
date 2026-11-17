import { MutationObserver } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/api/chatRequests", () => ({
  CHAT_MESSAGES_PAGE_SIZE: 50,
  getChatMembers: vi.fn(),
  addChatMember: vi.fn(),
  removeChatMember: vi.fn(),
  getSharedProjects: vi.fn(),
  getChatMessagesPage: vi.fn(),
  sendChatMessage: vi.fn(),
  deleteChatMessage: vi.fn(),
}));

import * as chatApi from "@/app/api/chatRequests";
import type { ChatMessage } from "@/app/contracts/responses";
import { addMemberOptions, deleteMessageOptions, removeMemberOptions, sendMessageOptions } from "../query/chat";
import { addMessage, isEmptyChat, oldestFirst, removeMessage, type ChatMessagePages } from "../query/chatCache";
import { chatInvalidationsFor } from "../query/invalidation";
import { qk, resourceOf } from "../query/keys";
import { chatMembersSpec, chatMessagesSpec, sharedProjectsSpec } from "../query/specs";
import { failResult, flush, okResult, testClient } from "../query/__tests__/helpers";

const U = "u1";
const P = "P1";
const m = (id: string, at = "2026-11-17T10:00:00.000Z"): ChatMessage => ({
  id,
  project_id: P,
  user_id: "u2",
  username: "bob",
  body: `body ${id}`,
  created_at: at,
});
/** Newest first, like the API. */
const pages = (...items: ChatMessage[][]): ChatMessagePages => ({
  pages: items.map((i, idx) => ({ items: i, next_cursor: idx < items.length - 1 ? `c${idx + 1}` : null })),
  pageParams: items.map((_, idx) => (idx === 0 ? undefined : `c${idx}`)),
});

beforeEach(() => vi.clearAllMocks());

describe("CH1: keys and specs (the key equals the request parameters)", () => {
  const signal = new AbortController().signal;

  it("members", async () => {
    const spec = chatMembersSpec(U, P);
    expect(spec.queryKey).toEqual(["u", U, "projects", P, "members"]);
    vi.mocked(chatApi.getChatMembers).mockResolvedValueOnce(okResult([]) as never);
    await spec.queryFn({ signal });
    expect(chatApi.getChatMembers).toHaveBeenCalledWith(P, { signal });
  });

  it("shared projects", async () => {
    const spec = sharedProjectsSpec(U);
    expect(spec.queryKey).toEqual(["u", U, "projects", "shared"]);
    vi.mocked(chatApi.getSharedProjects).mockResolvedValueOnce(okResult([]) as never);
    await spec.queryFn({ signal });
    expect(chatApi.getSharedProjects).toHaveBeenCalledWith({ signal });
  });

  it("messages: infinite, the cursor is the page param", async () => {
    const spec = chatMessagesSpec(U, P);
    expect(spec.queryKey).toEqual(["u", U, "projects", P, "messages"]);
    vi.mocked(chatApi.getChatMessagesPage).mockResolvedValueOnce(okResult({ items: [], next_cursor: null }) as never);
    await spec.queryFn({ signal, pageParam: "abc" });
    expect(chatApi.getChatMessagesPage).toHaveBeenCalledWith(P, "abc", { signal });
    expect(spec.initialPageParam).toBeUndefined();
    expect(spec.getNextPageParam({ next_cursor: "x" })).toBe("x");
    expect(spec.getNextPageParam({ next_cursor: null })).toBeUndefined();
  });

  it("chat keys sit under the user's projects prefix and never under another user's", () => {
    const starts = (child: readonly unknown[], prefix: readonly unknown[]) => prefix.every((p, i) => child[i] === p);
    expect(starts(qk.chatMembers(U, P), qk.projects(U))).toBe(true);
    expect(starts(qk.chatMessages(U, P), qk.project(U, P))).toBe(true);
    expect(starts(qk.sharedProjects(U), qk.projects(U))).toBe(true);
    expect(starts(qk.chatMessages("u2", P), qk.projects(U))).toBe(false);
  });

  it("log labels never contain key values", () => {
    expect(resourceOf(qk.chatMembers("USER-S", "PROJ-S"))).toBe("chat.members");
    expect(resourceOf(qk.chatMessages("USER-S", "PROJ-S"))).toBe("chat.messages");
    expect(resourceOf(qk.sharedProjects("USER-S"))).toBe("chat.shared");
    expect(resourceOf(qk.project("USER-S", "PROJ-S"))).toBe("projects.detail");
  });

  it("each chat event declares what it invalidates", () => {
    expect(chatInvalidationsFor("chat-members", U, P)).toEqual([qk.chatMembers(U, P), qk.sharedProjects(U)]);
    expect(chatInvalidationsFor("chat-message", U, P)).toEqual([]);
  });
});

describe("CH2: message cache helpers", () => {
  it("addMessage prepends to the newest page once (REST response and socket echo)", () => {
    const data = pages([m("b"), m("a")]);
    const added = addMessage(data, m("c"))!;
    expect(added.pages[0].items.map((x) => x.id)).toEqual(["c", "b", "a"]);
    expect(addMessage(added, m("c"))).toBe(added);
    expect(addMessage(undefined, m("c"))).toBeUndefined();
  });

  it("removeMessage removes from any page; a missing id returns the same object", () => {
    const data = pages([m("d"), m("c")], [m("b"), m("a")]);
    const removed = removeMessage(data, "b")!;
    expect(removed.pages[1].items.map((x) => x.id)).toEqual(["a"]);
    expect(removed.pages[0]).toBe(data.pages[0]);
    expect(removeMessage(removed, "zzz")).toBe(removed);
  });

  it("oldestFirst puts the oldest at the top and drops duplicates", () => {
    const data = pages([m("d"), m("c")], [m("c"), m("b"), m("a")]);
    expect(oldestFirst(data).map((x) => x.id)).toEqual(["a", "b", "c", "d"]);
    expect(oldestFirst(undefined)).toEqual([]);
  });

  it("only a fully empty history is empty", () => {
    expect(isEmptyChat(pages([]))).toBe(true);
    expect(isEmptyChat(pages([], [m("a")]))).toBe(false);
  });
});

describe("CH3: mutations", () => {
  it("send writes the server's message into the cache, trims the body, and refetches nothing", async () => {
    const qc = testClient();
    qc.setQueryData(qk.chatMessages(U, P), pages([m("a")]));
    const spy = vi.spyOn(qc, "invalidateQueries");
    vi.mocked(chatApi.sendChatMessage).mockResolvedValueOnce(okResult(m("b")) as never);
    await new MutationObserver(qc, sendMessageOptions(qc, U, P)).mutate("  hello  ");
    expect(chatApi.sendChatMessage).toHaveBeenCalledWith(P, { body: "hello" });
    expect(qc.getQueryData<ChatMessagePages>(qk.chatMessages(U, P))!.pages[0].items.map((x) => x.id)).toEqual(["b", "a"]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("a failed send leaves the cache untouched", async () => {
    const qc = testClient();
    const before = pages([m("a")]);
    qc.setQueryData(qk.chatMessages(U, P), before);
    vi.mocked(chatApi.sendChatMessage).mockResolvedValueOnce(failResult("http") as never);
    await new MutationObserver(qc, sendMessageOptions(qc, U, P)).mutate("hi").catch(() => {});
    expect(qc.getQueryData(qk.chatMessages(U, P))).toBe(before);
  });

  it("delete removes the message after the server accepted it", async () => {
    const qc = testClient();
    qc.setQueryData(qk.chatMessages(U, P), pages([m("b"), m("a")]));
    vi.mocked(chatApi.deleteChatMessage).mockResolvedValueOnce(okResult(undefined) as never);
    await new MutationObserver(qc, deleteMessageOptions(qc, U, P)).mutate("a");
    expect(chatApi.deleteChatMessage).toHaveBeenCalledWith(P, "a");
    expect(oldestFirst(qc.getQueryData(qk.chatMessages(U, P))).map((x) => x.id)).toEqual(["b"]);
  });

  it("add member trims the username and invalidates members and shared projects", async () => {
    const qc = testClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    vi.mocked(chatApi.addChatMember).mockResolvedValueOnce(okResult(undefined) as never);
    await new MutationObserver(qc, addMemberOptions(qc, U, P)).mutate(" alice ");
    await flush();
    expect(chatApi.addChatMember).toHaveBeenCalledWith(P, { username: "alice" });
    expect(spy.mock.calls.map(([f]) => f?.queryKey)).toEqual([qk.chatMembers(U, P), qk.sharedProjects(U)]);
  });

  it("leaving (removing yourself) drops that chat from the cache and refreshes the shared list", async () => {
    const qc = testClient();
    qc.setQueryData(qk.chatMessages(U, P), pages([m("a")]));
    qc.setQueryData(qk.chatMembers(U, P), []);
    const spy = vi.spyOn(qc, "invalidateQueries");
    vi.mocked(chatApi.removeChatMember).mockResolvedValueOnce(okResult(undefined) as never);
    await new MutationObserver(qc, removeMemberOptions(qc, U, P)).mutate(U);
    await flush();
    expect(chatApi.removeChatMember).toHaveBeenCalledWith(P, U);
    expect(qc.getQueryData(qk.chatMessages(U, P))).toBeUndefined();
    expect(qc.getQueryData(qk.chatMembers(U, P))).toBeUndefined();
    expect(spy.mock.calls.map(([f]) => f?.queryKey)).toEqual([qk.sharedProjects(U)]);
  });

  it("the owner removing someone else keeps the chat and refreshes members", async () => {
    const qc = testClient();
    qc.setQueryData(qk.chatMessages(U, P), pages([m("a")]));
    const spy = vi.spyOn(qc, "invalidateQueries");
    vi.mocked(chatApi.removeChatMember).mockResolvedValueOnce(okResult(undefined) as never);
    await new MutationObserver(qc, removeMemberOptions(qc, U, P)).mutate("u9");
    await flush();
    expect(qc.getQueryData(qk.chatMessages(U, P))).toBeDefined();
    expect(spy.mock.calls.map(([f]) => f?.queryKey)).toEqual([qk.chatMembers(U, P), qk.sharedProjects(U)]);
  });
});
