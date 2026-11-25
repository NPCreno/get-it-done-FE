import { describe, expect, it } from "vitest";
import contract from "../api-contract.json";
import { chatSocketUrl, CLOSE_UNAUTHORIZED, parseChatFrame } from "@/lib/chatSocket";
import { CHAT_SSE_EVENT } from "@/lib/notificationStream";
import { formatUnread } from "@/lib/query/chatUnread";
import { CHAT_MESSAGES_PAGE_SIZE } from "../../api/chatRequests";
import { MCP_PATH, mcpServerUrl } from "@/lib/mcpSetup";
import { DEFAULT_EXPIRY } from "../../components/apiTokens/tokenCopy";
import { AUTHORIZE_PARAM_KEYS } from "@/lib/oauthConsent";
import { CONSENT_PATH } from "@/lib/safeNext";
import { OAUTH_DECISIONS, OAuthAuthorizeParamsSchema, SetTaskAssigneeRequestSchema } from "../requests";
import { TASKS_SSE_EVENT } from "@/lib/notificationStream";
import {
  ApiTokenSchema,
  ChatMemberSchema,
  CreatedApiTokenSchema,
  ChatMembersSchema,
  ChatMessageSchema,
  ChatMessagesPageSchema,
  ChatReadSchema,
  ChatUnreadSchema,
  SharedProjectSchema,
  OAuthCheckResultSchema,
  OAuthDecisionResultSchema,
  OAuthGrantSchema,
  ProjectTaskSchema,
  TaskListItemSchema,
} from "../responses";
import { API_TOKEN_RULES, LIMITS, PATTERNS } from "../common";
import {
  API_TOKEN_EXPIRY_DAYS,
  API_TOKEN_STATUSES,
  BOOLEAN_STRINGS,
  NEW_TASK_STATUSES,
  NOTIFICATION_TYPES,
  POMODORO_STYLES,
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
    expect([...POMODORO_STYLES]).toEqual(contract.pomodoroStyles);
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

describe("FEAT-07 personal access tokens match the contract's tokens section", () => {
  const T = contract.tokens;
  const keys = (schema: { shape: Record<string, unknown> }) => Object.keys(schema.shape).sort();

  it("schemas have exactly the contract's fields", () => {
    expect(keys(ApiTokenSchema)).toEqual([...T.fields.token].sort());
    expect(keys(CreatedApiTokenSchema)).toEqual([...T.fields.createdToken].sort());
  });

  it("statuses, expiry choices, default, cap, prefix and name limit", () => {
    expect([...API_TOKEN_STATUSES]).toEqual(T.statuses);
    expect([...API_TOKEN_EXPIRY_DAYS]).toEqual(T.expiresInDays);
    expect(API_TOKEN_RULES.defaultExpiryDays).toBe(T.defaultExpiresInDays);
    expect(DEFAULT_EXPIRY).toBe(T.defaultExpiresInDays);
    expect(API_TOKEN_RULES.maxActive).toBe(T.maxActive);
    expect(API_TOKEN_RULES.prefix).toBe(T.prefix);
    expect(API_TOKEN_RULES.nameMax).toBe(contract.limits.tokenNameMax);
  });

  it("the MCP path sits at the API origin, not under /api", () => {
    expect(MCP_PATH).toBe(T.mcpPath);
    expect(mcpServerUrl("https://api.example.com/api")).toBe(`https://api.example.com${T.mcpPath}`);
  });
});

describe("FEAT-07d OAuth consent and connected apps match the contract's oauth section", () => {
  const O = contract.oauth;
  const keys = (schema: { shape: Record<string, unknown> }) => Object.keys(schema.shape).sort();
  const option = (outcome: string) => OAuthCheckResultSchema.options.find((o) => o.shape.outcome.value === outcome)!;

  it("the consent page is the authorization endpoint the BE advertises", () => {
    expect(CONSENT_PATH).toBe(O.authorizePath);
  });

  it("check outcomes and their fields", () => {
    expect(OAuthCheckResultSchema.options.map((o) => o.shape.outcome.value)).toEqual(O.checkOutcomes);
    expect(keys(option("ok"))).toEqual([...O.fields.authorizeCheck].sort());
    expect(keys(option("redirect"))).toEqual([...O.fields.authorizeCheckRedirect].sort());
    expect(keys(option("fatal"))).toEqual([...O.fields.authorizeCheckFatal].sort());
  });

  it("decision, forwarded parameters and the grant row", () => {
    expect([...OAUTH_DECISIONS]).toEqual(O.decisions);
    expect([...AUTHORIZE_PARAM_KEYS]).toEqual(O.authorizeParams);
    expect(keys(OAuthAuthorizeParamsSchema)).toEqual([...O.authorizeParams].sort());
    expect(keys(OAuthDecisionResultSchema)).toEqual([...O.fields.authorizeDecision].sort());
    expect(keys(OAuthGrantSchema)).toEqual([...O.fields.grant].sort());
  });
});

describe("FEAT-09 shared tasks match the contract's tasks section", () => {
  const T = contract.tasks;
  const keys = (schema: { shape: Record<string, unknown> }) => Object.keys(schema.shape);

  it("the SSE event name", () => {
    expect(TASKS_SSE_EVENT).toBe(T.sseEventType);
  });

  it("every task row schema has the sharing fields; the user list has its extras", () => {
    for (const f of T.fields.sharing) {
      expect(keys(ProjectTaskSchema)).toContain(f);
      expect(keys(TaskListItemSchema)).toContain(f);
    }
    for (const f of T.fields.userRowExtra) expect(keys(TaskListItemSchema)).toContain(f);
  });

  it("the assignee body and the tasks event fields", () => {
    expect(keys(SetTaskAssigneeRequestSchema).sort()).toEqual([...T.fields.assigneeBody].sort());
    expect(T.fields.tasksEvent).toEqual(["project_id"]);
  });
});
