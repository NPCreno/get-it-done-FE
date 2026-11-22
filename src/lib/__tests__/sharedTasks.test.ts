import { MutationObserver } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/api/taskRequests", async (orig) => ({
  ...(await orig<typeof import("@/app/api/taskRequests")>()),
  setTaskAssignee: vi.fn(),
}));

import * as taskApi from "@/app/api/taskRequests";
import {
  ASSIGNEE_PARTIAL_FAILURE,
  assigneeAfterProjectChange,
  assigneeChange,
  assigneeChip,
  assigneeOptions,
  canDeleteTask,
  initialsOf,
  sharedProjectLabel,
  showAssigneeSelect,
  showRecurringAssigneeHint,
  UNASSIGNED,
} from "@/app/components/tasks/assignee";
import { outcomeWithAssignee } from "@/app/components/tasks/taskSaveOutcome";
import { toCreateTaskRequest } from "@/app/contracts/mappers";
import { CreateTaskRequestSchema, SetTaskAssigneeRequestSchema } from "@/app/contracts/requests";
import {
  NotificationsPageSchema,
  ProjectTaskSchema,
  TaskListItemSchema,
  type ChatMembers,
} from "@/app/contracts/responses";
import type { TaskFormValues } from "@/app/contracts/forms";
import { invalidateUnlessMutating, tasksInvalidationsFor } from "../query/invalidation";
import { qk } from "../query/keys";
import { setTaskAssigneeOptions, TASK_DATA_KEY } from "../query/mutations";
import { deferred, failResult, flush, okResult, testClient } from "../query/__tests__/helpers";

const U = "user-me";
const P = "PRJ-1";
const fixtures = join(__dirname, "..", "..", "app", "contracts", "__fixtures__");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const load = (name: string): any => JSON.parse(readFileSync(join(fixtures, `${name}.json`), "utf8"));

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("FEAT-09 schemas", () => {
  it("tasks-shared parses with every new field", () => {
    // Captured as member B: B's own task in A's project, and A's task assigned to B.
    const rows = TaskListItemSchema.array().parse(load("tasks-shared").data);
    expect(rows[0]).toMatchObject({ title: "Member task", assignee_id: null, can_delete: true, creator_username: "ebcd7324" });
    expect(rows[1]).toMatchObject({
      title: "Owner task one",
      assignee_username: "ebcd7324",
      can_delete: false,
      project_owner_username: "eacdb5c3",
      creator_username: "eacdb5c3",
    });
  });

  it("a row from a backend without the new fields still parses: unassigned and deletable", () => {
    const { creator_username, assignee_id, assignee_username, can_delete, project_owner_username, ...old } = load("tasks-list").data[0];
    void [creator_username, assignee_id, assignee_username, can_delete, project_owner_username];
    const row = TaskListItemSchema.parse(old);
    expect(row).toMatchObject({ assignee_id: null, assignee_username: null, can_delete: true, project_owner_username: null });
    const { can_delete: _cd, assignee_id: _a, assignee_username: _au, creator_username: _c, user_id: _u, ...oldProjectRow } = load("tasks-by-project")[0];
    void [_cd, _a, _au, _c, _u];
    const projectRow = ProjectTaskSchema.parse(oldProjectRow);
    expect(projectRow.can_delete).toBe(true);
  });

  it("the by-project row carries the creator and the assignee when sent", () => {
    const row = ProjectTaskSchema.parse({
      ...load("tasks-by-project")[0],
      user_id: "user-owner",
      assignee_id: U,
      assignee_username: "me",
      can_delete: false,
    });
    expect(row).toMatchObject({ user_id: "user-owner", assignee_id: U, can_delete: false });
  });
});

describe("the bell tolerates notification types it does not know", () => {
  const known = load("notification-assignment").data.items[0];

  it("an assignment row parses", () => {
    expect(NotificationsPageSchema.parse(load("notification-assignment").data).items[0].type).toBe("assignment");
  });

  it("one unknown type is dropped (warned once) and the other rows stay", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const page = {
      items: [known, { ...known, notif_id: "n2", type: "somethingNew" }, { ...known, notif_id: "n3", type: "streak" }],
      unread_count: 3,
      next_cursor: null,
    };
    const parsed = NotificationsPageSchema.parse(page);
    expect(parsed.items.map((n) => n.notif_id)).toEqual([known.notif_id, "n3"]);
    expect(parsed.unread_count).toBe(3);
    NotificationsPageSchema.parse(page);
    expect(warn.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("a known type with a broken row still fails the page (a real contract break)", () => {
    const page = { items: [{ ...known, read: "yes" }], unread_count: 1, next_cursor: null };
    expect(NotificationsPageSchema.safeParse(page).success).toBe(false);
  });
});

describe("requests", () => {
  const base = { title: "Write the brief", priority: "Low", status: "Pending", isRecurring: false } as const;

  it("create may carry an assignee only with a project and not for a recurring task", () => {
    expect(CreateTaskRequestSchema.safeParse({ ...base, project_id: P, assignee_id: "user-b" }).success).toBe(true);
    expect(CreateTaskRequestSchema.safeParse({ ...base, assignee_id: "user-b" }).success).toBe(false);
    expect(
      CreateTaskRequestSchema.safeParse({ ...base, project_id: P, assignee_id: "user-b", isRecurring: true, repeat_every: "Day", start_date: "2026-01-01T00:00:00.000Z" }).success
    ).toBe(false);
  });

  it("the assignee body is a user id or null", () => {
    expect(SetTaskAssigneeRequestSchema.safeParse({ assignee_id: null }).success).toBe(true);
    expect(SetTaskAssigneeRequestSchema.safeParse({ assignee_id: "user-b" }).success).toBe(true);
    expect(SetTaskAssigneeRequestSchema.safeParse({ assignee_id: "" }).success).toBe(false);
  });

  it("the create mapper sends the assignee, but never for a recurring task or Unassigned", () => {
    const v = {
      title: "T", description: "", priority: "Low", status: "Pending", project_id: P, project_title: "", project_color: "", project: "",
      due_date: null, isRecurring: false, repeat_every: "", repeat_days: [], start_date: null, end_date: null, assignee_id: "user-b",
    } satisfies TaskFormValues;
    expect(toCreateTaskRequest(v).assignee_id).toBe("user-b");
    expect(toCreateTaskRequest({ ...v, assignee_id: UNASSIGNED }).assignee_id).toBeUndefined();
    expect(toCreateTaskRequest({ ...v, isRecurring: true, repeat_every: "Day" }).assignee_id).toBeUndefined();
  });
});

describe("AssigneeSelect rules", () => {
  const people: ChatMembers = {
    owner: { user_id: "user-owner", username: "owner", fullname: "" },
    members: [
      { user_id: U, username: "me", fullname: "" },
      { user_id: "user-b", username: "bea", fullname: "" },
      { user_id: "user-owner", username: "owner", fullname: "" },
    ],
  };

  it("Unassigned first, then the owner and the members once each, me marked (you)", () => {
    expect(assigneeOptions(people, U)).toEqual([
      { value: "", label: "Unassigned" },
      { value: "user-owner", label: "owner" },
      { value: U, label: "me (you)" },
      { value: "user-b", label: "bea" },
    ]);
    expect(assigneeOptions(undefined, U)).toEqual([{ value: "", label: "Unassigned" }]);
  });

  it("hidden without a project, hidden for a recurring task (the hint shows instead), hidden in the demo", () => {
    expect(showAssigneeSelect({ projectId: undefined, isRecurring: false, sharingEnabled: true })).toBe(false);
    expect(showAssigneeSelect({ projectId: P, isRecurring: false, sharingEnabled: true })).toBe(true);
    expect(showAssigneeSelect({ projectId: P, isRecurring: true, sharingEnabled: true })).toBe(false);
    expect(showRecurringAssigneeHint({ projectId: P, isRecurring: true, sharingEnabled: true })).toBe(true);
    expect(showRecurringAssigneeHint({ projectId: undefined, isRecurring: true, sharingEnabled: true })).toBe(false);
    expect(showAssigneeSelect({ projectId: P, isRecurring: false, sharingEnabled: false })).toBe(false);
    expect(showRecurringAssigneeHint({ projectId: P, isRecurring: true, sharingEnabled: false })).toBe(false);
  });

  it("changing the project resets the assignee; picking the same project keeps it", () => {
    expect(assigneeAfterProjectChange(P, "PRJ-2", "user-b")).toBe(UNASSIGNED);
    expect(assigneeAfterProjectChange(P, P, "user-b")).toBe("user-b");
    expect(assigneeAfterProjectChange("", P, "")).toBe(UNASSIGNED);
  });
});

describe("edit saving", () => {
  it("the assignee call happens only when the assignee changed, and only with a project", () => {
    expect(assigneeChange("user-b", "user-b", P)).toEqual({ changed: false });
    expect(assigneeChange(null, UNASSIGNED, P)).toEqual({ changed: false });
    expect(assigneeChange(undefined, UNASSIGNED, P)).toEqual({ changed: false });
    expect(assigneeChange(null, "user-b", P)).toEqual({ changed: true, assigneeId: "user-b" });
    expect(assigneeChange("user-b", UNASSIGNED, P)).toEqual({ changed: true, assigneeId: null });
    expect(assigneeChange(null, "user-b", null)).toEqual({ changed: false });
  });

  const ok = { ok: true as const, data: undefined };
  const fail = { ok: false as const, failure: { ok: false as const, status: 500, kind: "http" as const, message: "x" } };

  it("a failed assignee call after a saved update closes with the partial-failure toast", () => {
    expect(outcomeWithAssignee(ok, fail)).toEqual({
      close: true,
      reset: true,
      toast: { kind: "warning", title: "Task Updated", message: ASSIGNEE_PARTIAL_FAILURE },
    });
    expect(ASSIGNEE_PARTIAL_FAILURE).toBe("Task saved, but the assignee couldn't be changed.");
  });

  it("otherwise it is the plain update outcome", () => {
    expect(outcomeWithAssignee(ok, ok).toast).toMatchObject({ kind: "success", title: "Task Updated" });
    expect(outcomeWithAssignee(ok, null).toast).toMatchObject({ kind: "success" });
    expect(outcomeWithAssignee(fail, null)).toMatchObject({ close: false, toast: { kind: "failure" } });
  });
});

describe("rows", () => {
  it("delete shows exactly when the server says can_delete", () => {
    expect(canDeleteTask({ can_delete: false })).toBe(false);
    expect(canDeleteTask({ can_delete: true })).toBe(true);
    expect(canDeleteTask({})).toBe(true);
  });

  it("the chip: nothing unassigned, You for me, Assigned to <username> otherwise", () => {
    expect(assigneeChip({ assignee_id: null }, U)).toBeNull();
    expect(assigneeChip({ assignee_id: U, assignee_username: "me" }, U)).toEqual({ initials: "ME", text: "You" });
    expect(assigneeChip({ assignee_id: "user-b", assignee_username: "ana.cruz" }, U)).toEqual({ initials: "AC", text: "Assigned to ana.cruz" });
    expect(initialsOf("bo")).toBe("BO");
  });

  it("in <project> · <owner> only for someone else's project (the BE sends the owner for mine too)", () => {
    expect(sharedProjectLabel({ project_title: "Launch", project_owner_username: "owner" }, "me")).toBe("in Launch · owner");
    expect(sharedProjectLabel({ project_title: "Mine", project_owner_username: "me" }, "me")).toBeNull();
    expect(sharedProjectLabel({ project_title: "Mine", project_owner_username: null }, "me")).toBeNull();
    expect(sharedProjectLabel({ project_title: "Launch", project_owner_username: "owner" }, undefined)).toBeNull();
  });
});

describe("refresh", () => {
  it("tasksInvalidationsFor: that project's tasks, my task board and the dashboard", () => {
    expect(tasksInvalidationsFor(U, P)).toEqual([
      ["u", U, "tasks", "project", P],
      ["u", U, "tasks", "upcoming"],
      qk.analytics(U),
    ]);
  });

  it("the keys are prefixes of the real query keys", () => {
    const w = { start: "2026-01-01T00:00:00.000Z", end: "2026-01-02T00:05:00.000Z" };
    const [project, board] = tasksInvalidationsFor(U, P);
    expect(qk.projectTasks(U, P, w).slice(0, project.length)).toEqual(project);
    expect(qk.upcoming(U, w).slice(0, board.length)).toEqual(board);
  });

  it("an SSE refresh waits while a task mutation of mine is in flight", async () => {
    const qc = testClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    await invalidateUnlessMutating(qc, TASK_DATA_KEY, tasksInvalidationsFor(U, P));
    expect(spy).toHaveBeenCalledTimes(3);

    spy.mockClear();
    const d = deferred<ReturnType<typeof okResult>>();
    vi.mocked(taskApi.setTaskAssignee).mockReturnValueOnce(d.promise as never);
    const m = new MutationObserver(qc, setTaskAssigneeOptions(qc, U));
    const p = m.mutate({ taskId: "t1", projectId: P, assigneeId: "user-b" });
    await flush();
    expect(invalidateUnlessMutating(qc, TASK_DATA_KEY, tasksInvalidationsFor(U, P))).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
    d.resolve(okResult(undefined));
    await p;
    // The mutation's own settle refreshed the same keys.
    expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toEqual(tasksInvalidationsFor(U, P));
  });

  it("the assignee mutation sends the change and refreshes even when it fails", async () => {
    const qc = testClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    vi.mocked(taskApi.setTaskAssignee).mockResolvedValueOnce(failResult("http") as never);
    const m = new MutationObserver(qc, setTaskAssigneeOptions(qc, U));
    await m.mutate({ taskId: "t1", projectId: P, assigneeId: null }).catch(() => undefined);
    expect(taskApi.setTaskAssignee).toHaveBeenCalledWith("t1", null);
    expect(spy).toHaveBeenCalledTimes(3);
  });
});
