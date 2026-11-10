import type {
  CreateProjectRequest,
  CreateSubTaskRequest,
  CreateTaskRequest,
  CreateUserRequest,
  UpdateProjectRequest,
  UpdateTaskRequest,
  UpdateUserRequest,
} from "./requests";
import {
  NEW_TASK_STATUSES,
  REPEAT_EVERY,
  TASK_PRIORITIES,
  TASK_STATUSES,
  THEMES,
  WEEKDAYS,
  narrow,
} from "./enums";
import type {
  ProfileFormValues,
  ProjectFormValues,
  SubTaskFormValues,
  TaskFormValues,
} from "./forms";

/**
 * Mappers return DRAFTS (every field optional): a form can be incomplete, and
 * the request schema, applied by `apiClient`, decides whether it is sendable.
 * None of them include `user_id`.
 */
export type CreateTaskDraft = Partial<CreateTaskRequest>;
export type UpdateTaskDraft = UpdateTaskRequest;
export type CreateProjectDraft = Partial<CreateProjectRequest>;
export type UpdateProjectDraft = UpdateProjectRequest;
export type CreateSubTaskDraft = Partial<CreateSubTaskRequest>;
export type CreateUserDraft = Partial<CreateUserRequest>;

type DateInput = string | Date | null | undefined;

/** ISO string, or undefined for empty/invalid input. */
export function toIso(value: DateInput): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** '' (cleared field) becomes null so an update can actually clear a value. */
const emptyToNull = (v: string | null | undefined): string | null => (v === undefined || v === null || v === "" ? null : v);
const emptyToUndefined = (v: string | null | undefined): string | undefined => (v === undefined || v === null || v === "" ? undefined : v);

/** Weekday names only, de-duplicated, in the order given. Drops "" and unknowns. */
export function cleanRepeatDays(days: readonly string[] | undefined): (typeof WEEKDAYS)[number][] {
  const out: (typeof WEEKDAYS)[number][] = [];
  for (const d of days ?? []) {
    const day = narrow(WEEKDAYS, d);
    if (day && !out.includes(day)) out.push(day);
  }
  return out;
}

export function toCreateTaskRequest(
  v: TaskFormValues,
  opts: { projectId?: string } = {}
): CreateTaskDraft {
  const recurring = v.isRecurring === true;
  const repeatEvery = narrow(REPEAT_EVERY, v.repeat_every);
  return {
    project_id: emptyToUndefined(opts.projectId ?? v.project_id),
    title: v.title,
    description: emptyToUndefined(v.description),
    priority: narrow(TASK_PRIORITIES, v.priority),
    status: narrow(NEW_TASK_STATUSES, v.status) ?? "Pending",
    isRecurring: recurring,
    repeat_every: recurring ? repeatEvery : undefined,
    repeat_days: recurring && repeatEvery === "Week" ? cleanRepeatDays(v.repeat_days) : undefined,
    start_date: recurring ? toIso(v.start_date) : undefined,
    end_date: recurring ? toIso(v.end_date) : undefined,
    due_date: recurring ? undefined : toIso(v.due_date),
  };
}

export function toUpdateTaskRequest(v: Pick<TaskFormValues, "title" | "description" | "priority" | "status" | "due_date">): UpdateTaskDraft {
  return {
    title: v.title,
    description: emptyToNull(v.description),
    priority: narrow(TASK_PRIORITIES, v.priority),
    status: narrow(TASK_STATUSES, v.status),
    due_date: toIso(v.due_date) ?? null,
  };
}

export function toCreateProjectRequest(v: ProjectFormValues): CreateProjectDraft {
  return {
    title: v.title,
    description: emptyToUndefined(v.description),
    color: v.color,
    colorLabel: v.colorLabel,
    due_date: toIso(v.due_date),
  };
}

export function toUpdateProjectRequest(v: ProjectFormValues): UpdateProjectDraft {
  return {
    title: v.title,
    description: emptyToNull(v.description),
    color: emptyToUndefined(v.color),
    colorLabel: emptyToUndefined(v.colorLabel),
    due_date: toIso(v.due_date) ?? null,
  };
}

export function toCreateSubTaskRequest(v: SubTaskFormValues): CreateSubTaskDraft {
  return {
    task_id: v.task_id,
    title: v.title,
    status: narrow(NEW_TASK_STATUSES, v.status) ?? "Pending",
    due_date: toIso(v.due_date),
  };
}

export function toSignupRequest(v: { fullname: string; username: string; email: string; password: string }): CreateUserDraft {
  return { fullname: v.fullname, username: v.username, email: v.email, password: v.password };
}

/**
 * Names are sent only when they changed (the backend rate-limits name and
 * password changes to once per six months); an empty password means unchanged.
 */
export function toProfileUpdateRequest(
  v: ProfileFormValues,
  original: { fullname: string; username: string }
): UpdateUserRequest {
  const out: UpdateUserRequest = {
    enableNotifications: v.enableNotifications ? "true" : "false",
    soundFx: v.soundFx ? "true" : "false",
  };
  if (v.fullname && v.fullname !== original.fullname) out.fullname = v.fullname;
  if (v.username && v.username !== original.username) out.username = v.username;
  if (v.password) out.password = v.password;
  const theme = narrow(THEMES, v.theme);
  if (theme) out.theme = theme;
  return out;
}
