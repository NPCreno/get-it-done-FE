import { z } from "zod";
import { ApiDate, LIMITS, PATTERNS } from "./common";
import {
  BOOLEAN_STRINGS,
  NEW_TASK_STATUSES,
  REPEAT_EVERY,
  TASK_PRIORITIES,
  TASK_STATUSES,
  THEMES,
  WEEKDAYS,
} from "./enums";

const title = z.string().min(LIMITS.titleMin).max(LIMITS.titleMax);
const description = z.string().max(LIMITS.descriptionMax);

export const CreateUserRequestSchema = z.object({
  fullname: z.string().min(LIMITS.fullnameMin).max(LIMITS.fullnameMax),
  username: z.string().min(LIMITS.usernameMin).max(LIMITS.usernameMax).regex(new RegExp(PATTERNS.username)),
  email: z.string().email(),
  password: z.string().min(LIMITS.passwordMin).max(LIMITS.passwordMax).regex(new RegExp(PATTERNS.password)),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

export const UpdateUserRequestSchema = z.object({
  fullname: CreateUserRequestSchema.shape.fullname.optional(),
  username: CreateUserRequestSchema.shape.username.optional(),
  password: CreateUserRequestSchema.shape.password.optional(),
  enableNotifications: z.enum(BOOLEAN_STRINGS).optional(),
  theme: z.enum(THEMES).optional(),
  soundFx: z.enum(BOOLEAN_STRINGS).optional(),
});
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

/** No user_id: the backend takes the owner from the token. */
export const CreateProjectRequestSchema = z.object({
  title,
  description: description.optional(),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  colorLabel: z.string().max(LIMITS.colorLabelMax),
  due_date: ApiDate.optional(),
});
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const UpdateProjectRequestSchema = z.object({
  title: title.optional(),
  description: description.nullable().optional(),
  color: CreateProjectRequestSchema.shape.color.optional(),
  colorLabel: CreateProjectRequestSchema.shape.colorLabel.optional(),
  due_date: ApiDate.nullable().optional(),
});
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;

export const CreateTaskRequestSchema = z
  .object({
    project_id: z.string().min(1).optional(),
    title,
    description: description.optional(),
    priority: z.enum(TASK_PRIORITIES),
    status: z.enum(NEW_TASK_STATUSES),
    isRecurring: z.boolean(),
    repeat_every: z.enum(REPEAT_EVERY).optional(),
    repeat_days: z.array(z.enum(WEEKDAYS)).optional(),
    start_date: ApiDate.optional(),
    end_date: ApiDate.optional(),
    due_date: ApiDate.optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.isRecurring) return;
    if (!v.repeat_every) ctx.addIssue({ code: "custom", path: ["repeat_every"], message: "Repeat every is required" });
    if (!v.start_date) ctx.addIssue({ code: "custom", path: ["start_date"], message: "Start date is required" });
    if (v.repeat_every === "Week") {
      const days = v.repeat_days ?? [];
      if (days.length === 0) ctx.addIssue({ code: "custom", path: ["repeat_days"], message: "Select at least one day" });
      if (new Set(days).size !== days.length) ctx.addIssue({ code: "custom", path: ["repeat_days"], message: "Days must be unique" });
    }
    if (v.start_date && v.end_date && Date.parse(v.end_date) < Date.parse(v.start_date)) {
      ctx.addIssue({ code: "custom", path: ["end_date"], message: "End date must not be before start date" });
    }
  });
export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;

export const UpdateTaskRequestSchema = z.object({
  title: title.optional(),
  description: description.nullable().optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  due_date: ApiDate.nullable().optional(),
});
export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;

export const CreateSubTaskRequestSchema = z.object({
  task_id: z.string().min(1),
  title,
  status: z.enum(NEW_TASK_STATUSES),
  due_date: ApiDate.optional(),
});
export type CreateSubTaskRequest = z.infer<typeof CreateSubTaskRequestSchema>;
