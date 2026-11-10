import { z } from "zod";
import { ApiDate, Count, DateOnly, NullableText, OptionalText } from "./common";
import { TASK_PRIORITIES, TASK_STATUSES } from "./enums";

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
  id: z.number(),
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
  id: z.number(),
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
