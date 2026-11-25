import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { UserSchema } from "../responses";
import { UpdateUserRequestSchema } from "../requests";
import { toProfileUpdateRequest } from "../mappers";
import { POMODORO_STYLES } from "../enums";

/** FEAT-10 §1f: the user's `pomodoroStyle` on the wire. */
const user = (): Record<string, unknown> =>
  JSON.parse(readFileSync(join(__dirname, "..", "__fixtures__", "user-set.json"), "utf8"));

describe("UserSchema.pomodoroStyle", () => {
  it("a row without the field (before 47a) still parses, as not set", () => {
    const row = user();
    delete row.pomodoroStyle;
    const parsed = UserSchema.parse(row);
    expect(parsed.pomodoroStyle).toBeUndefined();
  });

  it("null parses as not set", () => {
    expect(UserSchema.parse({ ...user(), pomodoroStyle: null }).pomodoroStyle).toBeUndefined();
  });

  it("a set value passes through", () => {
    for (const style of POMODORO_STYLES) {
      expect(UserSchema.parse({ ...user(), pomodoroStyle: style }).pomodoroStyle).toBe(style);
    }
  });
});

describe("UpdateUserRequestSchema.pomodoroStyle", () => {
  it("accepts the three styles", () => {
    for (const style of POMODORO_STYLES) {
      expect(UpdateUserRequestSchema.safeParse({ pomodoroStyle: style }).success).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(UpdateUserRequestSchema.safeParse({ pomodoroStyle: "clock" }).success).toBe(false);
    expect(UpdateUserRequestSchema.safeParse({ pomodoroStyle: "Dial" }).success).toBe(false);
    expect(UpdateUserRequestSchema.safeParse({ pomodoroStyle: null }).success).toBe(false);
  });
});

describe("the Profile form's Save never sends the timer style", () => {
  it("toProfileUpdateRequest has no pomodoroStyle, whatever the values hold", () => {
    const values = {
      fullname: "Ann Lee",
      username: "ann_lee",
      password: "",
      enableNotifications: true,
      soundFx: false,
      theme: "dark",
      pomodoroStyle: "horizon",
    };
    const out = toProfileUpdateRequest(values, { fullname: "Ann Lee", username: "ann_lee" });
    expect(out).not.toHaveProperty("pomodoroStyle");
  });
});
