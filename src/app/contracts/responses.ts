import { z } from "zod";
import { API_TOKEN_RULES, ApiDate, Count, DateOnly, NullableText, OptionalText } from "./common";
import { API_TOKEN_STATUSES, NOTIFICATION_ACTION_TYPES, NOTIFICATION_TYPES, TASK_PRIORITIES, TASK_STATUSES } from "./enums";

/**
 * Response schemas, derived field by field from the backend entities and the
 * service mappings. A nullable column (key always sent) is `.nullable()`,
 * never `.optional()`. Endpoint-specific shapes get their own schema. Extra
 * keys are stripped, so a backend addition is not a break. The inferred types
 * are the OUTPUT types: null text becomes "" for display, and update mappers
 * turn "" back into null.
 */

export const SubTaskSchema = z.object({
  id: z.string(),
  taskSubInstance_id: z.string(),
  title: z.string(),
  status: z.enum(TASK_STATUSES),
  due_date: ApiDate.nullable(),
  createdAt: ApiDate,
  updatedAt: ApiDate,
});
export type SubTask = z.infer<typeof SubTaskSchema>;

/**
 * FEAT-09 shared-task fields, on every task row. `.default()` keeps a row from a backend without
 * them (the release window, old fixtures) parsing: unassigned, and deletable as before, since the
 * old backend only ever returned your own tasks. `can_delete` always comes from the server.
 */
const sharedTaskFields = {
  creator_username: z.string().nullable().default(null),
  assignee_id: z.string().nullable().default(null),
  assignee_username: z.string().nullable().default(null),
  can_delete: z.boolean().default(true),
};

/** getTasksByUser (envelope). project_id is null for tasks without a project. */
export const TaskListItemSchema = z.object({
  id: z.string(), // a uuid since OPS-04 (BUG-05)
  task_id: z.string(),
  title: z.string(),
  description: NullableText,
  priority: z.enum(TASK_PRIORITIES),
  status: z.enum(TASK_STATUSES),
  due_date: ApiDate.nullable(),
  createdAt: ApiDate,
  updatedAt: ApiDate,
  deletedAt: ApiDate.nullable(),
  user_id: z.string(),
  project_id: z.string().nullable(),
  project_title: z.string().nullable(),
  template_id: z.string().nullable(),
  subInstances: z.array(SubTaskSchema),
  ...sharedTaskFields,
  /** Set when the project is someone else's (FEAT-09): "in <project> · <owner>". */
  project_owner_username: z.string().nullable().default(null),
});
export type TaskListItem = z.infer<typeof TaskListItemSchema>;

/** getTasksByProj (raw array). Always has project_id; no user/template/subtask fields. */
export const ProjectTaskSchema = z.object({
  id: z.string(), // a uuid since OPS-04 (BUG-05)
  task_id: z.string(),
  title: z.string(),
  description: NullableText,
  priority: z.enum(TASK_PRIORITIES),
  status: z.enum(TASK_STATUSES),
  due_date: ApiDate.nullable(),
  createdAt: ApiDate,
  updatedAt: ApiDate,
  deletedAt: ApiDate.nullable(),
  project_id: z.string(),
  /** The creator (FEAT-09); members see other people's tasks here. */
  user_id: z.string().optional(),
  ...sharedTaskFields,
});
export type ProjectTask = z.infer<typeof ProjectTaskSchema>;

const projectColumns = {
  id: z.number(),
  project_id: z.string(),
  title: NullableText,
  description: NullableText,
  color: NullableText,
  colorLabel: NullableText,
  due_date: ApiDate.nullable(),
  createdAt: ApiDate,
  updatedAt: ApiDate,
  deletedAt: ApiDate.nullable(),
  user_id: z.string(),
};

/** projects/getAll/:id (SanitizedProject): entity columns plus counts. */
export const ProjectListItemSchema = z.object({
  ...projectColumns,
  task_count: Count,
  task_completed: Count,
});
export type ProjectListItem = z.infer<typeof ProjectListItemSchema>;

/** projects/:id: the entity, without counts. */
export const ProjectSchema = z.object(projectColumns);
export type Project = z.infer<typeof ProjectSchema>;

/** user/get/:id (raw): the entity minus password. */
export const UserSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  fullname: z.string(),
  username: z.string(),
  email: z.string(),
  tier: z.string(),
  theme: OptionalText,
  enableNotifications: OptionalText,
  soundFx: OptionalText,
  // FEAT-10: optional too, so a user row from before 47a (no such key) still parses.
  pomodoroStyle: OptionalText.optional(),
  // RD-1: the theme family (null = classic). Optional too, for a row from before 51a.
  appTheme: OptionalText.optional(),
  role: z.string().nullable(),
  status: z.string().nullable(),
  createdAt: ApiDate,
  updatedAt: ApiDate,
  deletedAt: ApiDate.nullable(),
  premiumExpiry: ApiDate.nullable(),
  lastLoginAt: ApiDate.nullable(),
  loginAttempts: z.number().nullable(),
});
export type UserRecord = z.infer<typeof UserSchema>;

export const DashboardDataSchema = z.object({
  all_tasks: Count,
  pending_tasks: Count,
  complete_tasks: Count,
  all_projects: Count,
});
export type DashboardData = z.infer<typeof DashboardDataSchema>;

export const TrendPointSchema = z.object({
  date: DateOnly,
  day: z.string(),
  completed: Count,
});
export type TrendPoint = z.infer<typeof TrendPointSchema>;

export const DistributionSchema = z.object({
  title: z.string(),
  value: Count,
  fill: z.string(),
});
export type Distribution = z.infer<typeof DistributionSchema>;

export const HeatmapCellSchema = z.object({
  date: DateOnly,
  value: Count,
});
export type HeatmapCell = z.infer<typeof HeatmapCellSchema>;

export const StreakSchema = z.object({ count: Count });
export type Streak = z.infer<typeof StreakSchema>;

/** One notification. metadata and actionTarget are never sent by the backend. */
export const NotificationSchema = z.object({
  notif_id: z.string(),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string(),
  message: NullableText,
  read: z.boolean(),
  actionType: z.enum(NOTIFICATION_ACTION_TYPES).nullable(),
  createdAt: ApiDate,
});
export type Notification = z.infer<typeof NotificationSchema>;

let warnedUnknownType = false;

/**
 * Drops rows whose `type` this FE does not know (a newer backend, or the minutes between the BE and
 * FE releases), warning once. A row with a known type that is otherwise malformed still fails.
 */
export function dropUnknownNotificationTypes(rows: unknown[]): unknown[] {
  return rows.filter((row) => {
    const type = typeof row === "object" && row !== null ? (row as { type?: unknown }).type : undefined;
    if (typeof type !== "string" || (NOTIFICATION_TYPES as readonly string[]).includes(type)) return true;
    if (!warnedUnknownType) {
      warnedUnknownType = true;
      console.warn("[notifications] dropped a row with an unknown type");
    }
    return false;
  });
}

/** GET /notifications (envelope data). */
export const NotificationsPageSchema = z.object({
  items: z.array(z.unknown()).transform(dropUnknownNotificationTypes).pipe(NotificationSchema.array()),
  unread_count: Count,
  next_cursor: z.string().nullable(),
});
export type NotificationsPage = z.infer<typeof NotificationsPageSchema>;

// ------------------------------------------------------------------- chat (FEAT-05)

/** A person in a project's chat: the owner or a member. */
export const ChatMemberSchema = z.object({
  user_id: z.string(),
  username: z.string(),
  fullname: NullableText,
});
export type ChatMember = z.infer<typeof ChatMemberSchema>;

/** GET /chat/projects/:id/members: the owner apart from the members. */
export const ChatMembersSchema = z.object({
  owner: ChatMemberSchema,
  members: ChatMemberSchema.array(),
});
export type ChatMembers = z.infer<typeof ChatMembersSchema>;

/** GET /chat/shared-projects: projects someone else owns and shared with me. */
export const SharedProjectSchema = z.object({
  project_id: z.string(),
  title: NullableText,
  color: NullableText,
  owner_username: z.string(),
});
export type SharedProject = z.infer<typeof SharedProjectSchema>;

/** One chat message, the same shape over REST and in a socket event. */
export const ChatMessageSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  user_id: z.string(),
  username: z.string(),
  body: z.string(),
  created_at: ApiDate,
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/** GET /chat/projects/:id/messages (envelope data): newest first, opaque cursor. */
export const ChatMessagesPageSchema = z.object({
  items: ChatMessageSchema.array(),
  next_cursor: z.string().nullable(),
});
export type ChatMessagesPage = z.infer<typeof ChatMessagesPageSchema>;

/**
 * GET /chat/unread (FEAT-08): only projects with unread messages are listed. Each count is
 * capped at 100 by the server (the UI shows "99+"); `total` is the sum of the capped counts.
 */
export const ChatUnreadSchema = z.object({
  items: z.object({ project_id: z.string(), unread_count: Count }).array(),
  total: Count,
});
export type ChatUnread = z.infer<typeof ChatUnreadSchema>;

/** PUT /chat/projects/:id/read: the read point after the write (it never moves back). */
export const ChatReadSchema = z.object({
  project_id: z.string(),
  last_read_at: ApiDate,
});
export type ChatRead = z.infer<typeof ChatReadSchema>;

/**
 * Server-to-client frames on /chat/ws, all `{ type, data }`. Only the frames the
 * app acts on are listed; `joined`, `left` and anything unknown fail the parse
 * and are ignored.
 */
export const ChatSocketEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready"), data: z.object({ user_id: z.string() }) }),
  z.object({ type: z.literal("message.created"), data: ChatMessageSchema }),
  z.object({ type: z.literal("message.deleted"), data: z.object({ id: z.string(), project_id: z.string() }) }),
  /** This user was removed from the project (or left in another tab). */
  z.object({ type: z.literal("removed"), data: z.object({ project_id: z.string() }) }),
  z.object({
    type: z.literal("error"),
    data: z.object({ code: z.string(), project_id: z.string().optional() }),
  }),
]);
export type ChatSocketEvent = z.infer<typeof ChatSocketEventSchema>;

// ------------------------------------------------------- API tokens (FEAT-07)

/**
 * One personal access token as listed by GET /tokens. Never a secret or a hash: an unknown key
 * (say a `token` the backend sent by mistake) is stripped here, so it cannot reach the cache.
 */
export const ApiTokenSchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  created_at: ApiDate,
  last_used_at: ApiDate.nullable(),
  expires_at: ApiDate.nullable(),
  revoked_at: ApiDate.nullable(),
  status: z.enum(API_TOKEN_STATUSES),
});
export type ApiToken = z.infer<typeof ApiTokenSchema>;

export const ApiTokenListSchema = ApiTokenSchema.array();
export type ApiTokenList = z.infer<typeof ApiTokenListSchema>;

/** The full token: `gid_pat_<prefix>_<secret>`, base62 and base64url characters only. */
export const ApiTokenSecret = z
  .string()
  .regex(new RegExp(`^${API_TOKEN_RULES.prefix}[A-Za-z0-9]+_[A-Za-z0-9_-]+$`), "Expected a gid_pat_ token");

/** POST /tokens: the list item plus the secret. The only time the secret leaves the server. */
export const CreatedApiTokenSchema = ApiTokenSchema.extend({ token: ApiTokenSecret });
export type CreatedApiToken = z.infer<typeof CreatedApiTokenSchema>;

// ------------------------------------------- OAuth connector consent (FEAT-07d)

/**
 * GET /oauth/authorize/check: what the consent page shows. Display only: the decision re-sends
 * the raw parameters and the backend validates them again.
 * - `ok`: show the consent screen.
 * - `redirect`: the request is wrong but the client is known, so the backend built the error
 *   redirect (`error=` and `state` already in it).
 * - `fatal`: unknown app or an unregistered `redirect_uri`. Show the error page, never redirect.
 */
export const OAuthCheckOkSchema = z.object({
  outcome: z.literal("ok"),
  client_name: z.string(),
  redirect_host: z.string(),
  loopback_only: z.boolean(),
  scopes: z.array(z.string()),
});
export const OAuthCheckResultSchema = z.discriminatedUnion("outcome", [
  OAuthCheckOkSchema,
  z.object({ outcome: z.literal("redirect"), error: z.string(), redirect_to: z.string() }),
  z.object({ outcome: z.literal("fatal"), error: z.string() }),
]);
export type OAuthCheckOk = z.infer<typeof OAuthCheckOkSchema>;
export type OAuthCheckResult = z.infer<typeof OAuthCheckResultSchema>;

/** POST /oauth/authorize (through the FE BFF): where the browser goes next. */
export const OAuthDecisionResultSchema = z.object({ redirect_to: z.string().min(1) });
export type OAuthDecisionResult = z.infer<typeof OAuthDecisionResultSchema>;

/** GET /oauth/grants: one connected app. Never a token or a hash; unknown keys are stripped. */
export const OAuthGrantSchema = z.object({
  id: z.string(),
  client_name: z.string(),
  redirect_host: z.string(),
  created_at: ApiDate,
  last_used_at: ApiDate.nullable(),
});
export type OAuthGrant = z.infer<typeof OAuthGrantSchema>;

export const OAuthGrantListSchema = OAuthGrantSchema.array();
export type OAuthGrantList = z.infer<typeof OAuthGrantListSchema>;
