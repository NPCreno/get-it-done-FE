import { z } from "zod";
import { ApiDate, Count, DateOnly, NullableText, OptionalText } from "./common";
import { NOTIFICATION_ACTION_TYPES, NOTIFICATION_TYPES, TASK_PRIORITIES, TASK_STATUSES } from "./enums";

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

/** getTasksByUser (envelope). project_id is null for tasks without a project. */
export const TaskListItemSchema = z.object({
  id: z.union([z.string(), z.number()]), // OPS-04: tighten after BE contract sync
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
});
export type TaskListItem = z.infer<typeof TaskListItemSchema>;

/** getTasksByProj (raw array). Always has project_id; no user/template/subtask fields. */
export const ProjectTaskSchema = z.object({
  id: z.union([z.string(), z.number()]), // OPS-04: tighten after BE contract sync
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

/** GET /notifications (envelope data). */
export const NotificationsPageSchema = z.object({
  items: NotificationSchema.array(),
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

/** Server-to-client frames on /chat/ws. Unknown frame types fail the parse and are ignored. */
export const ChatSocketEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready") }),
  z.object({ type: z.literal("message.created"), project_id: z.string(), message: ChatMessageSchema }),
  z.object({ type: z.literal("message.deleted"), project_id: z.string(), id: z.string() }),
]);
export type ChatSocketEvent = z.infer<typeof ChatSocketEventSchema>;
