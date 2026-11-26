import { describe, expect, it } from "vitest";
import { UpdateUserRequestSchema } from "../requests";
import { UserSchema } from "../responses";
import userSet from "../__fixtures__/user-set.json";

/** RD-1 §6: the user's `appTheme` and the `system` mode on the wire. */
const user = () => structuredClone(userSet as Record<string, unknown>);

describe("UserSchema appearance fields", () => {
  it("the BE fixture carries appTheme (null = classic) and parses", () => {
    expect(user()).toHaveProperty("appTheme");
    expect(UserSchema.safeParse(user()).success).toBe(true);
  });

  it("appTheme and the system mode pass through; null reads as not chosen", () => {
    const parsed = UserSchema.parse({ ...user(), appTheme: "field", theme: "system" });
    expect(parsed.appTheme).toBe("field");
    expect(parsed.theme).toBe("system");
    expect(UserSchema.parse({ ...user(), appTheme: null }).appTheme).toBeUndefined();
  });

  it("a row from before 51a (no appTheme key) still parses", () => {
    const row = user();
    delete row.appTheme;
    expect(UserSchema.safeParse(row).success).toBe(true);
  });
});

describe("UpdateUserRequestSchema appearance fields", () => {
  it("accepts every theme and mode, and rejects unknown ones", () => {
    for (const appTheme of ["classic", "calm", "field"]) expect(UpdateUserRequestSchema.safeParse({ appTheme }).success).toBe(true);
    for (const theme of ["light", "dark", "system"]) expect(UpdateUserRequestSchema.safeParse({ theme }).success).toBe(true);
    expect(UpdateUserRequestSchema.safeParse({ appTheme: "Calm" }).success).toBe(false);
    expect(UpdateUserRequestSchema.safeParse({ theme: "System" }).success).toBe(false);
  });
});
