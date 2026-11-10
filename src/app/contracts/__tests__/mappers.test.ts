import { describe, expect, it } from "vitest";
import {
  cleanRepeatDays,
  toCreateProjectRequest,
  toCreateSubTaskRequest,
  toCreateTaskRequest,
  toIso,
  toProfileUpdateRequest,
  toSignupRequest,
  toUpdateProjectRequest,
  toUpdateTaskRequest,
} from "../mappers";
import {
  CreateProjectRequestSchema,
  CreateSubTaskRequestSchema,
  CreateTaskRequestSchema,
  CreateUserRequestSchema,
  UpdateProjectRequestSchema,
  UpdateTaskRequestSchema,
  UpdateUserRequestSchema,
} from "../requests";
import type { ProfileFormValues, ProjectFormValues, SubTaskFormValues, TaskFormValues } from "../forms";

const task = (over: Partial<TaskFormValues> = {}): TaskFormValues => ({
  project_id: "",
  project_title: "",
  project_color: "",
  project: "",
  title: "Write report",
  description: "",
  priority: "High",
  status: "Pending",
  due_date: null,
  isRecurring: false,
  repeat_every: "",
  repeat_days: [],
  start_date: null,
  end_date: null,
  ...over,
});

const project = (over: Partial<ProjectFormValues> = {}): ProjectFormValues => ({
  title: "Website",
  description: "",
  color: "#336699",
  colorLabel: "Blue",
  due_date: null,
  ...over,
});

const START = "2026-02-01T00:00:00.000Z";

describe("no user_id in any create body", () => {
  it("task, project, sub-task and signup", () => {
    const bodies = [
      toCreateTaskRequest({ ...task(), user_id: "u1" } as TaskFormValues),
      toCreateProjectRequest({ ...project(), user_id: "u1" } as ProjectFormValues),
      toCreateSubTaskRequest({ title: "Sub", task_id: "t1", due_date: null, status: "Pending", user_id: "u1" } as SubTaskFormValues),
      toSignupRequest({ fullname: "Ann Lee", username: "ann_lee", email: "a@b.co", password: "secret12", user_id: "u1" } as never),
    ];
    for (const b of bodies) expect(Object.keys(b)).not.toContain("user_id");
  });
});

describe("toCreateTaskRequest", () => {
  it("passes its request schema (plain task)", () => {
    const r = CreateTaskRequestSchema.safeParse(toCreateTaskRequest(task({ due_date: START })));
    expect(r.success).toBe(true);
  });

  it("repeat_days only for Week, filtered to WEEKDAYS, with [''] removed", () => {
    const weekly = toCreateTaskRequest(
      task({ isRecurring: true, repeat_every: "Week", repeat_days: ["", "Monday", "Funday", "Monday", "Friday"], start_date: START })
    );
    expect(weekly.repeat_days).toEqual(["Monday", "Friday"]);
    expect(CreateTaskRequestSchema.safeParse(weekly).success).toBe(true);

    const daily = toCreateTaskRequest(
      task({ isRecurring: true, repeat_every: "Day", repeat_days: ["Monday"], start_date: START })
    );
    expect(daily.repeat_days).toBeUndefined();
    expect(CreateTaskRequestSchema.safeParse(daily).success).toBe(true);

    expect(toCreateTaskRequest(task({ repeat_every: "Week", repeat_days: ["Monday"] })).repeat_days).toBeUndefined();
  });

  it("a weekly task with only [''] is not sendable (the old silent no-op)", () => {
    const draft = toCreateTaskRequest(task({ isRecurring: true, repeat_every: "Week", repeat_days: [""], start_date: START }));
    expect(CreateTaskRequestSchema.safeParse(draft).success).toBe(false);
  });

  it("non-recurring tasks carry due_date, recurring ones carry start/end", () => {
    const plain = toCreateTaskRequest(task({ due_date: START, start_date: START }));
    expect(plain.due_date).toBe(START);
    expect(plain.start_date).toBeUndefined();
    const rec = toCreateTaskRequest(task({ isRecurring: true, repeat_every: "Day", start_date: START, end_date: "2026-03-01T00:00:00.000Z" }));
    expect(rec.start_date).toBe(START);
    expect(rec.due_date).toBeUndefined();
  });

  it("an unknown priority is dropped so the schema rejects it", () => {
    const draft = toCreateTaskRequest(task({ priority: "" }));
    expect(draft.priority).toBeUndefined();
    expect(CreateTaskRequestSchema.safeParse(draft).success).toBe(false);
  });

  it("Date objects and ISO strings both become ISO strings; garbage becomes undefined", () => {
    expect(toIso(new Date(START))).toBe(START);
    expect(toIso(START)).toBe(START);
    expect(toIso("not a date")).toBeUndefined();
    expect(toIso(null)).toBeUndefined();
  });

  it("an explicit project id overrides the form value", () => {
    expect(toCreateTaskRequest(task({ project_id: "a" }), { projectId: "b" }).project_id).toBe("b");
    expect(toCreateTaskRequest(task()).project_id).toBeUndefined();
  });
});

describe("update mappers turn '' back into null so values can be cleared", () => {
  it("task", () => {
    const u = toUpdateTaskRequest({ title: "Hello", description: "", priority: "Low", status: "Overdue", due_date: null });
    expect(u).toMatchObject({ description: null, due_date: null, status: "Overdue" });
    expect(UpdateTaskRequestSchema.safeParse(u).success).toBe(true);
  });

  it("project", () => {
    const u = toUpdateProjectRequest(project());
    expect(u).toMatchObject({ description: null, due_date: null });
    expect(UpdateProjectRequestSchema.safeParse(u).success).toBe(true);
  });

  it("values that are set are kept", () => {
    const u = toUpdateTaskRequest({ title: "Hello", description: "text", priority: "High", status: "Pending", due_date: START });
    expect(u).toMatchObject({ description: "text", due_date: START });
  });
});

describe("other create mappers pass their schemas", () => {
  it("project", () => {
    expect(CreateProjectRequestSchema.safeParse(toCreateProjectRequest(project({ description: "x", due_date: START }))).success).toBe(true);
  });

  it("sub-task", () => {
    const s: SubTaskFormValues = { title: "Sub", task_id: "task-1", due_date: null, status: "Pending" };
    expect(CreateSubTaskRequestSchema.safeParse(toCreateSubTaskRequest(s)).success).toBe(true);
  });

  it("signup", () => {
    const d = toSignupRequest({ fullname: "Ann Lee", username: "ann_lee", email: "a@b.co", password: "secret12" });
    expect(CreateUserRequestSchema.safeParse(d).success).toBe(true);
  });
});

describe("toProfileUpdateRequest", () => {
  const original = { fullname: "Ann Lee", username: "ann_lee" };
  const values = (over: Partial<ProfileFormValues> = {}): ProfileFormValues => ({
    fullname: "Ann Lee",
    username: "ann_lee",
    password: "",
    enableNotifications: true,
    soundFx: false,
    theme: "dark",
    ...over,
  });

  it("sends names only when they changed; an empty password is not sent", () => {
    const u = toProfileUpdateRequest(values(), original);
    expect(u).toEqual({ enableNotifications: "true", soundFx: "false", theme: "dark" });
    expect(UpdateUserRequestSchema.safeParse(u).success).toBe(true);
  });

  it("includes a changed name, username and password", () => {
    const u = toProfileUpdateRequest(values({ fullname: "Ann Marie", username: "annm", password: "newpass1" }), original);
    expect(u).toMatchObject({ fullname: "Ann Marie", username: "annm", password: "newpass1" });
    expect(UpdateUserRequestSchema.safeParse(u).success).toBe(true);
  });

  it("drops an unknown theme", () => {
    expect(toProfileUpdateRequest(values({ theme: "neon" }), original).theme).toBeUndefined();
  });
});

describe("cleanRepeatDays", () => {
  it("keeps order, removes duplicates and non-weekdays", () => {
    expect(cleanRepeatDays(["Friday", "", "Friday", "Monday", "mon"])).toEqual(["Friday", "Monday"]);
    expect(cleanRepeatDays(undefined)).toEqual([]);
  });
});
