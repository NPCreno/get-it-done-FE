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
  getChatUnread: vi.fn(),
  markChatRead: vi.fn(),
}));

import * as chatApi from "@/app/api/chatRequests";
import {
  ChatMembersSchema,
  ChatMessagesPageSchema,
  ChatReadSchema,
  ChatUnreadSchema,
  SharedProjectSchema,
  type ChatMessage,
  type ChatUnread,
} from "@/app/contracts/responses";
import { AddChatMemberRequestSchema, MarkChatReadRequestSchema, SendChatMessageRequestSchema } from "@/app/contracts/requests";
import {
  addMemberOptions,
  deleteMessageOptions,
  markReadOptions,
  removeMemberOptions,
  sendMessageOptions,
  unreadView,
} from "../query/chat";
import { clearUnread, formatUnread, restoreUnread, selectUnread, unreadLabel } from "../query/chatUnread";
import { addMessage, isEmptyChat, oldestFirst, removeMessage, type ChatMessagePages } from "../query/chatCache";
import { chatInvalidationsFor } from "../query/invalidation";
import { qk, resourceOf } from "../query/keys";
import { chatMembersSpec, chatMessagesSpec, chatUnreadSpec, sharedProjectsSpec } from "../query/specs";
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

  it("leaving (removing yourself) drops that chat from the cache and refreshes the shared list and unread counts", async () => {
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
    expect(spy.mock.calls.map(([f]) => f?.queryKey)).toEqual([qk.sharedProjects(U), qk.chatUnread(U)]);
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

describe("CH4: chat schemas (BE ChatMembersDto, SharedProjectDto, ChatMessagesPageDto)", () => {
  it("members: owner apart from members; a null fullname reads as empty", () => {
    const r = ChatMembersSchema.parse({
      owner: { user_id: "u1", username: "olivia", fullname: "Olivia O" },
      members: [{ user_id: "u2", username: "bob", fullname: null, extra: "stripped" }],
    });
    expect(r.members[0]).toEqual({ user_id: "u2", username: "bob", fullname: "" });
  });

  it("shared projects: title and color are nullable columns", () => {
    expect(SharedProjectSchema.parse({ project_id: "P1", title: null, color: null, owner_username: "olivia" })).toEqual({
      project_id: "P1",
      title: "",
      color: "",
      owner_username: "olivia",
    });
    expect(SharedProjectSchema.safeParse({ project_id: "P1", title: "t", color: "#fff" }).success).toBe(false);
  });

  it("messages page: ISO dates, nullable cursor", () => {
    expect(ChatMessagesPageSchema.safeParse({ items: [m("a")], next_cursor: null }).success).toBe(true);
    expect(ChatMessagesPageSchema.safeParse({ items: [{ ...m("a"), created_at: "nope" }], next_cursor: null }).success).toBe(false);
  });

  it("requests mirror the BE DTOs: trimmed body 1..2000 without NUL; exact username", () => {
    expect(SendChatMessageRequestSchema.parse({ body: "  hi  " })).toEqual({ body: "hi" });
    expect(SendChatMessageRequestSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(SendChatMessageRequestSchema.safeParse({ body: "x".repeat(2000) }).success).toBe(true);
    expect(SendChatMessageRequestSchema.safeParse({ body: "x".repeat(2001) }).success).toBe(false);
    expect(SendChatMessageRequestSchema.safeParse({ body: "a b" }).success).toBe(false);
    expect(AddChatMemberRequestSchema.safeParse({ username: "bob_1" }).success).toBe(true);
    expect(AddChatMemberRequestSchema.safeParse({ username: "bob smith" }).success).toBe(false);
    expect(AddChatMemberRequestSchema.safeParse({ username: "ab" }).success).toBe(false);
  });
});

// ------------------------------------------------------------- FEAT-08 unread

const unread = (...items: [string, number][]): ChatUnread => ({
  items: items.map(([project_id, unread_count]) => ({ project_id, unread_count })),
  total: items.reduce((n, [, c]) => n + c, 0),
});

describe("CH5: unread keys, spec and invalidation (FEAT-08)", () => {
  it("the spec's key equals its request (the user is the token)", async () => {
    const signal = new AbortController().signal;
    const spec = chatUnreadSpec(U);
    expect(spec.queryKey).toEqual(["u", U, "projects", "chat-unread"]);
    vi.mocked(chatApi.getChatUnread).mockResolvedValueOnce(okResult(unread()) as never);
    await spec.queryFn({ signal });
    expect(chatApi.getChatUnread).toHaveBeenCalledWith({ signal });
  });

  it("chatUnread sits under the projects prefix, so a project mutation invalidates it", async () => {
    const qc = testClient();
    qc.setQueryData(qk.chatUnread(U), unread(["P1", 2]));
    await qc.invalidateQueries({ queryKey: qk.projects(U) });
    expect(qc.getQueryState(qk.chatUnread(U))!.isInvalidated).toBe(true);
    expect(resourceOf(qk.chatUnread("USER-S"))).toBe("chat.unread");
  });

  it("mark-read invalidates only the counts; leaving also drops the badge", () => {
    expect(chatInvalidationsFor("chat-read", U, P)).toEqual([qk.chatUnread(U)]);
    expect(chatInvalidationsFor("chat-left", U, P)).toEqual([qk.sharedProjects(U), qk.chatUnread(U)]);
  });
});

describe("CH6: unread schemas (BE ChatUnreadDto, ChatReadDto)", () => {
  it("accepts counts and an empty list", () => {
    expect(ChatUnreadSchema.parse({ items: [{ project_id: "P1", unread_count: 3 }], total: 3 })).toEqual(unread(["P1", 3]));
    expect(ChatUnreadSchema.safeParse({ items: [], total: 0 }).success).toBe(true);
  });

  it("rejects a negative or fractional count", () => {
    expect(ChatUnreadSchema.safeParse({ items: [{ project_id: "P1", unread_count: -1 }], total: 0 }).success).toBe(false);
    expect(ChatUnreadSchema.safeParse({ items: [], total: -1 }).success).toBe(false);
    expect(ChatUnreadSchema.safeParse({ items: [{ project_id: "P1", unread_count: 1.5 }], total: 1 }).success).toBe(false);
  });

  it("read point: an ISO date; the request needs a message id", () => {
    expect(ChatReadSchema.safeParse({ project_id: "P1", last_read_at: "2026-11-18T10:00:00.000Z" }).success).toBe(true);
    expect(ChatReadSchema.safeParse({ project_id: "P1", last_read_at: "nope" }).success).toBe(false);
    expect(MarkChatReadRequestSchema.safeParse({ message_id: "m1" }).success).toBe(true);
    expect(MarkChatReadRequestSchema.safeParse({ message_id: "" }).success).toBe(false);
  });
});

describe("CH7: unread display helpers", () => {
  it("formatUnread: nothing at 0, then the number, then 99+", () => {
    expect(formatUnread(0)).toBe("");
    expect(formatUnread(1)).toBe("1");
    expect(formatUnread(99)).toBe("99");
    expect(formatUnread(100)).toBe("99+");
    expect(formatUnread(-3)).toBe("");
  });

  it("each badge has an accessible name", () => {
    expect(unreadLabel(1)).toBe("1 unread chat message");
    expect(unreadLabel(3)).toBe("3 unread chat messages");
    expect(unreadLabel(100)).toBe("more than 99 unread chat messages");
  });

  it("select gives a total and a lookup; open chats read 0 and leave the total", () => {
    const counts = selectUnread(unread(["P1", 3], ["P2", 100]));
    const shown = unreadView(counts, new Set());
    expect(shown.total).toBe(103);
    expect(shown.countFor("P2")).toBe(100);
    expect(shown.countFor("P9")).toBe(0);
    const whileOpen = unreadView(counts, new Set(["P1"]));
    expect(whileOpen.countFor("P1")).toBe(0);
    expect(whileOpen.total).toBe(100);
  });
});

describe("CH8: optimistic mark-read", () => {
  it("clearUnread sets one project to 0 and lowers the total; restore is compare-and-swap", () => {
    const data = unread(["P1", 3], ["P2", 5]);
    const cleared = clearUnread(data, "P1")!;
    expect(cleared).toEqual(unread(["P2", 5]));
    expect(clearUnread(cleared, "P1")).toBe(cleared);
    expect(restoreUnread(cleared, "P1", 3)).toEqual({ items: [...cleared.items, { project_id: "P1", unread_count: 3 }], total: 8 });
    // A newer server value (a refetch landed) wins over the rollback.
    const newer = unread(["P1", 4], ["P2", 5]);
    expect(restoreUnread(newer, "P1", 3)).toBe(newer);
  });

  it("success: the badge goes to 0 at once and the counts refetch", async () => {
    const qc = testClient();
    qc.setQueryData(qk.chatUnread(U), unread(["P1", 3], ["P2", 5]));
    const spy = vi.spyOn(qc, "invalidateQueries");
    vi.mocked(chatApi.markChatRead).mockResolvedValueOnce(
      okResult({ project_id: "P1", last_read_at: "2026-11-18T10:00:00.000Z" }) as never
    );
    await new MutationObserver(qc, markReadOptions(qc, U, "P1")).mutate("m9");
    await flush();
    expect(chatApi.markChatRead).toHaveBeenCalledWith("P1", "m9");
    expect(qc.getQueryData(qk.chatUnread(U))).toEqual(unread(["P2", 5]));
    expect(spy.mock.calls.map(([f]) => f?.queryKey)).toEqual([qk.chatUnread(U)]);
  });

  it("error: the count comes back", async () => {
    const qc = testClient();
    qc.setQueryData(qk.chatUnread(U), unread(["P1", 3], ["P2", 5]));
    vi.mocked(chatApi.markChatRead).mockResolvedValueOnce(failResult("network") as never);
    const seen: unknown[] = [];
    const observer = new MutationObserver(qc, {
      ...markReadOptions(qc, U, "P1"),
      onMutate: async (id, ctx) => {
        const r = await markReadOptions(qc, U, "P1").onMutate!(id, ctx);
        seen.push(qc.getQueryData(qk.chatUnread(U)));
        return r;
      },
    });
    await observer.mutate("m9").catch(() => {});
    await flush();
    expect(seen[0]).toEqual(unread(["P2", 5]));
    const after = qc.getQueryData<ChatUnread>(qk.chatUnread(U))!;
    expect(after.total).toBe(8);
    expect(after.items.find((i) => i.project_id === "P1")?.unread_count).toBe(3);
  });
});
