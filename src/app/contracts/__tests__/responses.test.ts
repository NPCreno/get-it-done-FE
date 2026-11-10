import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ZodTypeAny } from "zod";
import {
  DashboardDataSchema,
  DistributionSchema,
  HeatmapCellSchema,
  ProjectListItemSchema,
  ProjectSchema,
  ProjectTaskSchema,
  StreakSchema,
  TaskListItemSchema,
  TrendPointSchema,
  UserSchema,
} from "../responses";

const dir = join(__dirname, "..", "__fixtures__");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const load = (name: string): any => JSON.parse(readFileSync(join(dir, `${name}.json`), "utf8"));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** [fixture, schema, how to reach the payload]: envelope endpoints use `.data`, raw ones the body. */
const CASES: [string, ZodTypeAny, "envelope" | "raw"][] = [
  ["tasks-list", TaskListItemSchema.array(), "envelope"],
  ["tasks-empty", TaskListItemSchema.array(), "envelope"],
  ["tasks-by-project", ProjectTaskSchema.array(), "raw"],
  ["projects-list", ProjectListItemSchema.array(), "envelope"],
  ["projects-empty", ProjectListItemSchema.array(), "envelope"],
  ["project-single", ProjectSchema, "envelope"],
  ["project-null-fields", ProjectSchema, "envelope"],
  ["user-set", UserSchema, "raw"],
  ["user-null-prefs", UserSchema, "raw"],
  ["dashboard", DashboardDataSchema, "envelope"],
  ["dashboard-empty", DashboardDataSchema, "envelope"],
  ["heatmap-month", HeatmapCellSchema.array(), "envelope"],
  ["trend-week", TrendPointSchema.array(), "envelope"],
  ["distribution", DistributionSchema.array(), "envelope"],
  ["streak", StreakSchema, "envelope"],
];

const payload = (name: string) => {
  const kind = CASES.find((c) => c[0] === name)![2];
  const body = load(name);
  return kind === "envelope" ? body.data : body;
};

describe("every response schema parses the real captured fixtures", () => {
  for (const [name, schema] of CASES) {
    it(name, () => {
      const r = schema.safeParse(payload(name));
      expect(r.success, r.success ? "" : JSON.stringify(r.error.issues.slice(0, 3))).toBe(true);
    });
  }
});

describe("fixture coverage (so a passing parse means something)", () => {
  it("tasks cover null description/due_date, recurring, with and without subtasks", () => {
    const tasks = payload("tasks-list");
    expect(tasks.some((t: { description: unknown }) => t.description === null)).toBe(true);
    expect(tasks.some((t: { due_date: unknown }) => t.due_date === null)).toBe(true);
    expect(tasks.some((t: { template_id: unknown }) => t.template_id !== null)).toBe(true);
    expect(tasks.some((t: { subInstances: unknown[] }) => t.subInstances.length > 0)).toBe(true);
    expect(tasks.some((t: { subInstances: unknown[] }) => t.subInstances.length === 0)).toBe(true);
    expect(tasks.some((t: { project_id: unknown }) => t.project_id !== null)).toBe(true);
  });

  it("projects cover null title/color/colorLabel; users cover null and set theme", () => {
    const projects = payload("projects-list");
    expect(projects.some((p: { title: unknown; color: unknown; colorLabel: unknown }) => p.title === null && p.color === null && p.colorLabel === null)).toBe(true);
    expect(payload("user-null-prefs").theme).toBeNull();
    expect(payload("user-set").theme).not.toBeUndefined();
  });

  it("new-user lists are empty and the dashboard counts are zero", () => {
    expect(payload("tasks-empty")).toEqual([]);
    expect(payload("projects-empty")).toEqual([]);
    expect(Object.values(payload("dashboard-empty"))).toEqual([0, 0, 0, 0]);
  });

  it("a defaulted distribution title and date-only heatmap/trend dates are present", () => {
    expect(payload("distribution").some((d: { title: string }) => d.title === "Untitled Project")).toBe(true);
    expect(payload("heatmap-month")[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload("trend-week")[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("transforms (null text becomes empty text for display)", () => {
  it("project nulls become empty strings and user null prefs become undefined", () => {
    const projects = ProjectListItemSchema.array().parse(payload("projects-list"));
    const nullish = projects.find((p) => p.title === "");
    expect(nullish).toMatchObject({ title: "", description: "", color: "", colorLabel: "" });
    const user = UserSchema.parse(payload("user-null-prefs"));
    expect(user.theme).toBeUndefined();
  });

  it("task description null becomes an empty string", () => {
    const tasks = TaskListItemSchema.array().parse(payload("tasks-list"));
    expect(tasks.find((t) => t.description === "")).toBeTruthy();
  });
});

describe("negative cases are rejected", () => {
  const firstTask = () => clone(payload("tasks-list")[0]);

  it("missing task_id", () => {
    const t = firstTask();
    delete t.task_id;
    expect(TaskListItemSchema.safeParse(t).success).toBe(false);
  });

  it("status 'Done'", () => {
    const t = firstTask();
    t.status = "Done";
    expect(TaskListItemSchema.safeParse(t).success).toBe(false);
  });

  it("due_date 'garbage'", () => {
    const t = firstTask();
    t.due_date = "garbage";
    expect(TaskListItemSchema.safeParse(t).success).toBe(false);
  });

  it("a null task title (title is NOT NULL)", () => {
    const t = firstTask();
    t.title = null;
    expect(TaskListItemSchema.safeParse(t).success).toBe(false);
  });

  it("a count sent as a string", () => {
    expect(StreakSchema.safeParse({ count: "3" }).success).toBe(false);
    const d = clone(payload("dashboard"));
    d.all_tasks = "3";
    expect(DashboardDataSchema.safeParse(d).success).toBe(false);
  });

  it("a heatmap date sent as a full ISO timestamp", () => {
    expect(HeatmapCellSchema.safeParse({ date: "2026-01-15T09:00:00.000Z", value: 1 }).success).toBe(false);
  });

  it("a ProjectTask item without project_id", () => {
    const t = clone(payload("tasks-by-project")[0]);
    delete t.project_id;
    expect(ProjectTaskSchema.safeParse(t).success).toBe(false);
  });

  it("a missing key is not the same as null (nullable, not optional)", () => {
    const t = firstTask();
    delete t.description;
    expect(TaskListItemSchema.safeParse(t).success).toBe(false);
  });
});

describe("unknown extra keys are tolerated", () => {
  it("a backend addition is not a break", () => {
    const t = { ...firstTaskOf(), brand_new_field: 1 };
    expect(TaskListItemSchema.safeParse(t).success).toBe(true);
  });
});

function firstTaskOf() {
  return clone(payload("tasks-list")[0]);
}
