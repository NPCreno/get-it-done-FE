import type { ZodType, output } from "zod";
import {
  CreateSubTaskRequestSchema,
  CreateTaskRequestSchema,
  UpdateTaskRequestSchema,
} from "@/app/contracts/requests";
import type { TaskStatus } from "@/app/contracts/enums";
import { iso, utcDay, type Clock } from "./clock";
import type { DemoStore, ProjectRow, SubTaskRow, TaskRow } from "./store";

export type Out<T> =
  | { ok: true; data: T; message: string }
  | { ok: false; status: number; message: string | string[] };

const good = <T>(data: T, message: string): Out<T> => ({ ok: true, data, message });
const bad = (status: number, message: string | string[]): Out<never> => ({ ok: false, status, message });

const RETIRED = bad(503, "The demo is not running");
const NO_TASK = bad(404, "Task not found");
const NO_SUBTASK = bad(404, "Subtask not found");

function parse<T extends ZodType>(schema: T, body: unknown): { value: output<T> } | Out<never> {
  const r = schema.safeParse(body);
  if (r.success) return { value: r.data };
  return bad(
    400,
    r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
  );
}

// ------------------------------------------------------------------- views

export function subTaskView(s: SubTaskRow) {
  return {
    id: String(s.id),
    taskSubInstance_id: s.taskSubInstance_id,
    title: s.title,
    status: s.status,
    due_date: s.due === null ? null : iso(s.due),
    createdAt: iso(s.createdAt),
    updatedAt: iso(s.updatedAt),
  };
}

const projectOf = (store: DemoStore, id: string | null): ProjectRow | undefined =>
  id === null ? undefined : store.projects.find((p) => p.project_id === id);

/** The `getTasksByUser` row shape. */
export function taskView(store: DemoStore, t: TaskRow) {
  return {
    id: t.id,
    task_id: t.task_id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    due_date: t.due === null ? null : iso(t.due),
    createdAt: iso(t.createdAt),
    updatedAt: iso(t.updatedAt),
    deletedAt: null,
    user_id: store.userId,
    project_id: t.project_id,
    project_title: projectOf(store, t.project_id)?.title ?? null,
    template_id: t.template_id,
    subInstances: t.subtasks.map(subTaskView),
  };
}

export function projectView(store: DemoStore, p: ProjectRow) {
  const mine = store.tasks.filter((t) => t.project_id === p.project_id);
  return {
    id: p.id,
    project_id: p.project_id,
    title: p.title,
    description: p.description,
    color: p.color,
    colorLabel: p.colorLabel,
    due_date: p.due === null ? null : iso(p.due),
    createdAt: iso(p.createdAt),
    updatedAt: iso(p.updatedAt),
    deletedAt: null,
    user_id: store.userId,
    task_count: mine.length,
    task_completed: mine.filter((t) => t.status === "Complete").length,
  };
}

// ------------------------------------------------------------------- reads

/** Parses an ISO timestamp query value, or null. */
export function parseInstant(v: unknown): number | null {
  if (typeof v !== "string" || v === "") return null;
  const n = Date.parse(v);
  return Number.isNaN(n) ? null : n;
}

/**
 * Demo list rule (simplified, demo-only): a task is listed when it has no due date, or
 * its due date is inside [start, end] (inclusive), or it is overdue (due before start and
 * not Complete); a Complete task is listed when it is in the window or was completed in
 * the UTC day of `start`'s bucket or later (so "completed today" shows, long history does not).
 */
export function inWindow(t: TaskRow, start: number, end: number): boolean {
  if (t.status === "Complete") {
    if (t.due === null || (t.due >= start && t.due <= end)) return true;
    return t.completedAt !== null && t.completedAt >= utcDay(start);
  }
  return t.due === null || t.due <= end;
}

export function tasksInWindow(store: DemoStore, start: number, end: number): TaskRow[] {
  return store.tasks
    .filter((t) => inWindow(t, start, end))
    .sort((a, b) => (a.due ?? Infinity) - (b.due ?? Infinity) || a.id - b.id);
}

// ------------------------------------------------------------------ writes

function setStatus(row: { status: TaskStatus; completedAt: number | null; updatedAt: number }, to: TaskStatus, now: number) {
  if (to === "Complete" && row.status !== "Complete") row.completedAt = now;
  if (to !== "Complete") row.completedAt = null;
  row.status = to;
  row.updatedAt = now;
}

const findTask = (store: DemoStore, id: string) => store.tasks.find((t) => t.task_id === id);

function findSub(store: DemoStore, id: string): { task: TaskRow; sub: SubTaskRow } | undefined {
  for (const task of store.tasks) {
    const sub = task.subtasks.find((s) => s.taskSubInstance_id === id);
    if (sub) return { task, sub };
  }
  return undefined;
}

export function createTask(store: DemoStore, clock: Clock, body: unknown): Out<ReturnType<typeof taskView>> {
  if (store.retired) return RETIRED;
  const p = parse(CreateTaskRequestSchema, body);
  if (!("value" in p)) return p;
  const v = p.value;
  if (v.project_id !== undefined && !projectOf(store, v.project_id)) return bad(404, "Project not found");
  const now = clock.now();
  const id = store.nextId("task");
  const due = v.due_date ?? v.start_date;
  const row: TaskRow = {
    id,
    task_id: `demo-task-${id}`,
    title: v.title,
    description: v.description ?? null,
    priority: v.priority,
    status: "Pending",
    due: due === undefined ? null : Date.parse(due),
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    project_id: v.project_id ?? null,
    // Recurring tasks make ONE instance in the demo (no generation during a session).
    template_id: v.isRecurring ? `TMP-demo-${id}` : null,
    subtasks: [],
  };
  setStatus(row, v.status, now);
  store.tasks.push(row);
  return good(taskView(store, row), "Task created successfully");
}

export function updateTask(store: DemoStore, clock: Clock, taskId: string, body: unknown): Out<ReturnType<typeof taskView>> {
  if (store.retired) return RETIRED;
  const p = parse(UpdateTaskRequestSchema, body);
  if (!("value" in p)) return p;
  const row = findTask(store, taskId);
  if (!row) return NO_TASK;
  const v = p.value;
  const now = clock.now();
  if (v.title !== undefined) row.title = v.title;
  if (v.description !== undefined) row.description = v.description === "" ? null : v.description;
  if (v.priority !== undefined) row.priority = v.priority;
  if (v.due_date !== undefined) row.due = v.due_date === null ? null : Date.parse(v.due_date);
  if (v.status !== undefined) setStatus(row, v.status, now);
  row.updatedAt = now;
  return good(taskView(store, row), "Task updated successfully");
}

export function deleteTask(store: DemoStore, taskId: string): Out<null> {
  if (store.retired) return RETIRED;
  const i = store.tasks.findIndex((t) => t.task_id === taskId);
  if (i < 0) return NO_TASK;
  store.tasks.splice(i, 1);
  return good(null, "Task deleted successfully");
}

/** Removes the template's instances that are not Complete (completed history is kept). */
export function deleteRecurring(store: DemoStore, templateId: string): Out<null> {
  if (store.retired) return RETIRED;
  const keep = store.tasks.filter((t) => t.template_id !== templateId || t.status === "Complete");
  if (keep.length === store.tasks.length) return bad(404, "Recurring task not found");
  store.tasks.splice(0, store.tasks.length, ...keep);
  return good(null, "Recurring tasks deleted successfully");
}

export function setTaskStatus(store: DemoStore, clock: Clock, taskId: string, to: TaskStatus): Out<null> {
  if (store.retired) return RETIRED;
  const row = findTask(store, taskId);
  if (!row) return NO_TASK;
  setStatus(row, to, clock.now());
  return good(null, "Task status updated successfully");
}

export function createSubTask(store: DemoStore, clock: Clock, body: unknown): Out<ReturnType<typeof subTaskView>> {
  if (store.retired) return RETIRED;
  const p = parse(CreateSubTaskRequestSchema, body);
  if (!("value" in p)) return p;
  const v = p.value;
  const parent = findTask(store, v.task_id);
  if (!parent) return NO_TASK;
  const now = clock.now();
  const id = store.nextId("subtask");
  const row: SubTaskRow = {
    id,
    taskSubInstance_id: `demo-subtask-${id}`,
    title: v.title,
    status: "Pending",
    due: v.due_date === undefined ? null : Date.parse(v.due_date),
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  setStatus(row, v.status, now);
  parent.subtasks.push(row);
  return good(subTaskView(row), "Subtask created successfully");
}

export function deleteSubTask(store: DemoStore, subId: string): Out<null> {
  if (store.retired) return RETIRED;
  const hit = findSub(store, subId);
  if (!hit) return NO_SUBTASK;
  hit.task.subtasks.splice(hit.task.subtasks.indexOf(hit.sub), 1);
  return good(null, "Subtask deleted successfully");
}

/** Sets the subtask only. The parent is updated by the client's own follow-up call, as in the real flow. */
export function setSubTaskStatus(store: DemoStore, clock: Clock, subId: string, to: TaskStatus): Out<null> {
  if (store.retired) return RETIRED;
  const hit = findSub(store, subId);
  if (!hit) return NO_SUBTASK;
  setStatus(hit.sub, to, clock.now());
  return good(null, "Subtask status updated successfully");
}
