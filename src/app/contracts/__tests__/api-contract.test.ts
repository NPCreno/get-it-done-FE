import { describe, expect, it } from "vitest";
import contract from "../api-contract.json";
import { chatSocketUrl, CLOSE_UNAUTHORIZED, parseChatFrame } from "@/lib/chatSocket";
import { CHAT_SSE_EVENT } from "@/lib/notificationStream";
import { formatUnread } from "@/lib/query/chatUnread";
import { CHAT_MESSAGES_PAGE_SIZE } from "../../api/chatRequests";
import {
  ChatMemberSchema,
  ChatMembersSchema,
  ChatMessageSchema,
  ChatMessagesPageSchema,
  ChatReadSchema,
  ChatUnreadSchema,
  SharedProjectSchema,
} from "../responses";
import { LIMITS, PATTERNS } from "../common";
import {
  BOOLEAN_STRINGS,
  NEW_TASK_STATUSES,
  NOTIFICATION_TYPES,
  REPEAT_EVERY,
  TASK_PRIORITIES,
  TASK_STATUSES,
  THEMES,
  WEEKDAYS,
} from "../enums";

describe("FE literals match the vendored BE contract (src/app/contracts/api-contract.json)", () => {
  it("enums", () => {
    expect([...TASK_PRIORITIES]).toEqual(contract.taskPriorities);
    expect([...TASK_STATUSES]).toEqual(contract.taskStatuses);
    expect([...NEW_TASK_STATUSES]).toEqual(contract.newTaskStatuses);
    expect([...REPEAT_EVERY]).toEqual(contract.repeatEvery);
    expect([...WEEKDAYS]).toEqual(contract.weekdays);
    expect([...THEMES]).toEqual(contract.themes);
    expect([...BOOLEAN_STRINGS]).toEqual(contract.booleanStrings);
    expect([...NOTIFICATION_TYPES]).toEqual(contract.notificationTypes);
  });

  it("limits", () => {
    expect(LIMITS).toEqual(contract.limits);
  });

  it("regex sources", () => {
    expect(PATTERNS).toEqual(contract.patterns);
  });

  it("contract version is known", () => {
    expect(contract.version).toBe(1);
  });
});

describe("FEAT-05 chat matches the contract's chat section", () => {
  const C = contract.chat;
  const keys = (schema: { shape: Record<string, unknown> }) => Object.keys(schema.shape).sort();

  it("socket path and the unauthorized close code", () => {
    expect(chatSocketUrl("https://api.example.com/api")).toBe(`wss://api.example.com/api${C.wsPath}`);
    expect(CLOSE_UNAUTHORIZED).toBe(C.closeCodes.unauthorized);
  });

  it("every frame type the client parses is a server event the BE can send", () => {
    const parsed = ["ready", "message.created", "message.deleted", "removed", "error"];
    for (const t of parsed) expect(C.serverEvents).toContain(t);
    expect(parseChatFrame(JSON.stringify({ type: "error", data: { code: C.errorCodes[0] } }))).not.toBeNull();
  });

  it("response schemas have exactly the contract's fields", () => {
    expect(keys(ChatMemberSchema)).toEqual([...C.fields.member].sort());
    expect(keys(ChatMembersSchema)).toEqual([...C.fields.members].sort());
    expect(keys(SharedProjectSchema)).toEqual([...C.fields.sharedProject].sort());
    expect(keys(ChatMessageSchema)).toEqual([...C.fields.message].sort());
    expect(keys(ChatMessagesPageSchema)).toEqual([...C.fields.messagesPage].sort());
  });

  it("FEAT-08 unread: schemas have exactly the contract's fields", () => {
    expect(keys(ChatUnreadSchema)).toEqual([...C.fields.unread].sort());
    expect(keys(ChatUnreadSchema.shape.items.element)).toEqual([...C.fields.unreadItem].sort());
    expect(keys(ChatReadSchema)).toEqual([...C.fields.readPoint].sort());
  });

  it("FEAT-08 unread: the SSE event type and the cap the badge text relies on", () => {
    expect(CHAT_SSE_EVENT).toBe(C.sseEventType);
    // The server caps each count at 100, so "99+" means "100 or more" and is never cut short.
    expect(C.unreadCap).toBe(100);
    expect(formatUnread(C.unreadCap)).toBe("99+");
    expect(formatUnread(C.unreadCap - 1)).toBe("99");
  });

  it("the page size stays within the contract maximum", () => {
    expect(CHAT_MESSAGES_PAGE_SIZE).toBeLessThanOrEqual(contract.limits.chatMessagesPageMax);
  });
});
