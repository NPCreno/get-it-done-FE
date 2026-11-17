import { describe, expect, it } from "vitest";
import { ApiDate, Count, DateOnly, LIMITS, NullableText, OptionalText } from "../common";
import {
  BOOLEAN_STRINGS,
  NEW_TASK_STATUSES,
  NOTIFICATION_ACTION_TYPES,
  NOTIFICATION_TYPES,
  REPEAT_EVERY,
  TASK_PRIORITIES,
  TASK_STATUSES,
  THEMES,
  WEEKDAYS,
} from "../enums";
import {
  CreateProjectRequestSchema,
  CreateSubTaskRequestSchema,
  CreateTaskRequestSchema,
  CreateUserRequestSchema,
  UpdateProjectRequestSchema,
  UpdateTaskRequestSchema,
  UpdateUserRequestSchema,
} from "../requests";
import { NotificationSchema, SubTaskSchema, TaskListItemSchema } from "../responses";

/**
 * Pins how zod validates OUR schemas, so a zod major upgrade cannot change
 * request or response validation unnoticed (SEC-08).
 *
 * Group B (behavior) must pass unchanged across zod versions. If one fails
 * after an upgrade, fix the schema, not the test.
 *
 * Group M (messages) records zod's DEFAULT wording, which is expected to
 * change between majors. Update it deliberately and list old -> new in the PR.
 */

const validUser = { fullname: "Ada Lovelace", username: "ada_1", email: "ada@example.com", password: "secret1" };
const baseTask = { title: "Write", priority: "Low", status: "Pending", isRecurring: false } as const;
const recurring = { ...baseTask, isRecurring: true } as const;
const START = "2026-11-16";

/** [path, message] of every issue, in order. */
function issuesOf(r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  return r.success ? [] : r.error!.issues.map((i) => [i.path, i.message]);
}

describe("zod behavior (Group B: must not change)", () => {
  it("B1: unknown keys are dropped from request bodies", () => {
    const r = CreateUserRequestSchema.safeParse({ ...validUser, user_id: "x", role: "admin" });
    expect(r.success).toBe(true);
    expect(Object.keys(r.data!).sort()).toEqual(["email", "fullname", "password", "username"]);
    expect(r.data).toEqual(validUser);

    const u = UpdateProjectRequestSchema.safeParse({ title: "Home", user_id: "x", owner: "y" });
    expect(u.success).toBe(true);
    expect(u.data).toEqual({ title: "Home" });
    expect(Object.keys(u.data!)).toEqual(["title"]);
  });

  it("B2: absent optional keys stay absent; an explicit null is kept", () => {
    const empty = UpdateTaskRequestSchema.parse({});
    expect(empty).toEqual({});
    expect(Object.keys(empty)).toEqual([]);

    const cleared = UpdateTaskRequestSchema.parse({ description: null });
    expect(cleared).toEqual({ description: null });
    expect(Object.keys(cleared)).toEqual(["description"]);
  });

  it("B3: NullableText and OptionalText transforms", () => {
    expect(NullableText.parse(null)).toBe("");
    expect(NullableText.parse("x")).toBe("x");
    expect(OptionalText.parse(null)).toBeUndefined();
    expect(OptionalText.parse("x")).toBe("x");
    expect(NullableText.safeParse(undefined).success).toBe(false);
    expect(OptionalText.safeParse(undefined).success).toBe(false);
  });

  it("B4: ApiDate accepts parseable dates and rejects others with our message", () => {
    expect(ApiDate.safeParse("2026-11-16T08:30:00.000Z").success).toBe(true);
    expect(ApiDate.safeParse("2026-11-16").success).toBe(true);
    const r = ApiDate.safeParse("nope");
    expect(r.success).toBe(false);
    expect(issuesOf(r)).toEqual([[[], "Invalid date"]]);
  });

  it("B5: DateOnly accepts YYYY-MM-DD and rejects a timestamp with our message", () => {
    expect(DateOnly.safeParse("2026-11-16").success).toBe(true);
    const r = DateOnly.safeParse("2026-11-16T00:00:00.000Z");
    expect(r.success).toBe(false);
    expect(issuesOf(r)).toEqual([[[], "Expected YYYY-MM-DD"]]);
  });

  it("B6: Count is a non-negative integer number", () => {
    for (const ok of [0, 7]) expect(Count.safeParse(ok).success).toBe(true);
    for (const bad of [1.5, -1, "3", null]) expect(Count.safeParse(bad).success, String(bad)).toBe(false);
  });

  describe("B7: CreateTaskRequestSchema recurrence rules", () => {
    const cases: [string, Record<string, unknown>, [PropertyKey[], string][]][] = [
      ["recurring without repeat_every", { ...recurring, start_date: START }, [[["repeat_every"], "Repeat every is required"]]],
      ["recurring without start_date", { ...recurring, repeat_every: "Day" }, [[["start_date"], "Start date is required"]]],
      [
        "weekly with no days",
        { ...recurring, repeat_every: "Week", start_date: START },
        [[["repeat_days"], "Select at least one day"]],
      ],
      [
        "weekly with an empty days list",
        { ...recurring, repeat_every: "Week", start_date: START, repeat_days: [] },
        [[["repeat_days"], "Select at least one day"]],
      ],
      [
        "weekly with duplicate days",
        { ...recurring, repeat_every: "Week", start_date: START, repeat_days: ["Monday", "Monday"] },
        [[["repeat_days"], "Days must be unique"]],
      ],
      [
        "end_date before start_date",
        { ...recurring, repeat_every: "Day", start_date: START, end_date: "2026-11-10" },
        [[["end_date"], "End date must not be before start date"]],
      ],
      [
        "recurring with both fields missing",
        { ...recurring },
        [
          [["repeat_every"], "Repeat every is required"],
          [["start_date"], "Start date is required"],
        ],
      ],
    ];
    it.each(cases)("%s", (_name, input, expected) => {
      expect(issuesOf(CreateTaskRequestSchema.safeParse(input))).toEqual(expected);
    });

    it("a valid weekly task passes", () => {
      const r = CreateTaskRequestSchema.safeParse({
        ...recurring,
        repeat_every: "Week",
        start_date: START,
        end_date: "2026-12-01",
        repeat_days: ["Monday", "Friday"],
      });
      expect(r.success).toBe(true);
    });

    it("a non-recurring task triggers none of the rules", () => {
      const r = CreateTaskRequestSchema.safeParse({ ...baseTask, end_date: "2026-11-10", start_date: START, repeat_days: [] });
      expect(r.success).toBe(true);
      expect(CreateTaskRequestSchema.safeParse(baseTask).success).toBe(true);
    });
  });

  it("B8: email acceptance", () => {
    const email = (e: string) => CreateUserRequestSchema.safeParse({ ...validUser, email: e }).success;
    for (const ok of ["a.b+tag@sub.example.co", "USER@EXAMPLE.COM"]) expect(email(ok), ok).toBe(true);
    for (const bad of ["a@b", "a..b@x.com", ".a@x.com", "a b@x.com", ""]) expect(email(bad), bad).toBe(false);
  });

  describe("B9: patterns and length limits", () => {
    const user = (patch: Record<string, unknown>) => CreateUserRequestSchema.safeParse({ ...validUser, ...patch }).success;
    const project = (patch: Record<string, unknown>) =>
      CreateProjectRequestSchema.safeParse({ title: "Home", color: "#abc", colorLabel: "Blue", ...patch }).success;

    it("username pattern", () => {
      for (const ok of ["ada_1", "ADA", "a_b_c"]) expect(user({ username: ok }), ok).toBe(true);
      for (const bad of ["ada-1", "ada 1", "ada.1", "adà"]) expect(user({ username: bad }), bad).toBe(false);
    });

    it("password needs a digit", () => {
      expect(user({ password: "secret1" })).toBe(true);
      expect(user({ password: "secret" })).toBe(false);
    });

    it("project color is #rgb or #rrggbb", () => {
      for (const ok of ["#abc", "#A1B2C3", "#000000"]) expect(project({ color: ok }), ok).toBe(true);
      for (const bad of ["#abcd", "abc", "#ggg", "#abcdeff", ""]) expect(project({ color: bad }), bad).toBe(false);
    });

    /** [field, min, max, value builder, validator]. min 0 means no lower bound to test. */
    const limits: [string, number, number, (n: number) => string, (v: string) => boolean][] = [
      ["fullname", LIMITS.fullnameMin, LIMITS.fullnameMax, (n) => "a".repeat(n), (v) => user({ fullname: v })],
      ["username", LIMITS.usernameMin, LIMITS.usernameMax, (n) => "a".repeat(n), (v) => user({ username: v })],
      ["password", LIMITS.passwordMin, LIMITS.passwordMax, (n) => "1".repeat(n), (v) => user({ password: v })],
      [
        "task title",
        LIMITS.titleMin,
        LIMITS.titleMax,
        (n) => "a".repeat(n),
        (v) => CreateTaskRequestSchema.safeParse({ ...baseTask, title: v }).success,
      ],
      [
        "task description",
        0,
        LIMITS.descriptionMax,
        (n) => "a".repeat(n),
        (v) => CreateTaskRequestSchema.safeParse({ ...baseTask, description: v }).success,
      ],
      ["project colorLabel", 0, LIMITS.colorLabelMax, (n) => "a".repeat(n), (v) => project({ colorLabel: v })],
    ];
    it.each(limits)("%s length limits", (_field, min, max, build, valid) => {
      if (min > 0) {
        expect(valid(build(min - 1))).toBe(false);
        expect(valid(build(min))).toBe(true);
      }
      expect(valid(build(max))).toBe(true);
      expect(valid(build(max + 1))).toBe(false);
    });
  });

  describe("B10: every enum accepts its values and rejects others", () => {
    const task = (patch: Record<string, unknown>) => CreateTaskRequestSchema.safeParse({ ...baseTask, ...patch }).success;
    const enums: [string, readonly string[], (v: string) => boolean][] = [
      ["TASK_PRIORITIES (request)", TASK_PRIORITIES, (v) => task({ priority: v })],
      ["TASK_PRIORITIES (response)", TASK_PRIORITIES, (v) => TaskListItemSchema.shape.priority.safeParse(v).success],
      ["TASK_STATUSES (request)", TASK_STATUSES, (v) => UpdateTaskRequestSchema.safeParse({ status: v }).success],
      ["TASK_STATUSES (response)", TASK_STATUSES, (v) => SubTaskSchema.shape.status.safeParse(v).success],
      ["NEW_TASK_STATUSES (task)", NEW_TASK_STATUSES, (v) => task({ status: v })],
      [
        "NEW_TASK_STATUSES (subtask)",
        NEW_TASK_STATUSES,
        (v) => CreateSubTaskRequestSchema.safeParse({ task_id: "t1", title: "Do", status: v }).success,
      ],
      ["REPEAT_EVERY", REPEAT_EVERY, (v) => task({ repeat_every: v })],
      ["WEEKDAYS", WEEKDAYS, (v) => task({ repeat_days: [v] })],
      ["THEMES", THEMES, (v) => UpdateUserRequestSchema.safeParse({ theme: v }).success],
      ["BOOLEAN_STRINGS (enableNotifications)", BOOLEAN_STRINGS, (v) => UpdateUserRequestSchema.safeParse({ enableNotifications: v }).success],
      ["BOOLEAN_STRINGS (soundFx)", BOOLEAN_STRINGS, (v) => UpdateUserRequestSchema.safeParse({ soundFx: v }).success],
      ["NOTIFICATION_TYPES", NOTIFICATION_TYPES, (v) => NotificationSchema.shape.type.safeParse(v).success],
      ["NOTIFICATION_ACTION_TYPES", NOTIFICATION_ACTION_TYPES, (v) => NotificationSchema.shape.actionType.safeParse(v).success],
    ];
    it.each(enums)("%s", (_name, values, valid) => {
      for (const v of values) expect(valid(v), v).toBe(true);
      for (const bad of ["", "Unknown", values[0].toUpperCase() === values[0] ? values[0].toLowerCase() : values[0].toUpperCase()]) {
        expect(valid(bad), bad).toBe(false);
      }
    });
  });

  it("B11: the first issue's path", () => {
    const short = CreateTaskRequestSchema.safeParse({ ...baseTask, title: "a" });
    expect(short.success).toBe(false);
    expect(short.error!.issues[0].path).toEqual(["title"]);

    const day = CreateTaskRequestSchema.safeParse({ ...baseTask, repeat_days: ["Funday"] });
    expect(day.success).toBe(false);
    expect(day.error!.issues[0].path).toEqual(["repeat_days", 0]);
  });
});

describe("zod default messages (Group M: expected to change between majors)", () => {
  const firstMessage = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
    r.success ? null : r.error!.issues[0].message;
  const withoutFullname = { username: validUser.username, email: validUser.email, password: validUser.password };

  /** zod 4 wording (asserted). The zod 3.25 wording is kept in a comment for the record. */
  const cases: [string, unknown, string][] = [
    // zod 3: "Required"
    [
      "missing required string",
      CreateUserRequestSchema.safeParse(withoutFullname),
      "Invalid input: expected string, received undefined",
    ],
    // zod 3: "String must contain at least 3 character(s)"
    [
      "too-short string",
      CreateUserRequestSchema.safeParse({ ...validUser, fullname: "ab" }),
      "Too small: expected string to have >=3 characters",
    ],
    // zod 3: "String must contain at most 50 character(s)"
    [
      "too-long string",
      CreateUserRequestSchema.safeParse({ ...validUser, fullname: "a".repeat(LIMITS.fullnameMax + 1) }),
      "Too big: expected string to have <=50 characters",
    ],
    // zod 3: "Invalid enum value. Expected 'Low' | 'Medium' | 'High', received 'Urgent'"
    [
      "invalid enum value",
      CreateTaskRequestSchema.safeParse({ ...baseTask, priority: "Urgent" }),
      'Invalid option: expected one of "Low"|"Medium"|"High"',
    ],
    // zod 3: "Invalid email"
    ["invalid email", CreateUserRequestSchema.safeParse({ ...validUser, email: "nope" }), "Invalid email address"],
    // zod 3: "Invalid"
    [
      "pattern mismatch (username)",
      CreateUserRequestSchema.safeParse({ ...validUser, username: "ada-1" }),
      "Invalid string: must match pattern /^[A-Za-z0-9_]+$/",
    ],
  ];
  it.each(cases)("%s", (_name, result, expected) => {
    expect(firstMessage(result as Parameters<typeof firstMessage>[0])).toBe(expected);
  });
});
