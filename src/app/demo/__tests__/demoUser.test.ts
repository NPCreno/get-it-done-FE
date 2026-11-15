import { describe, expect, it } from "vitest";
import { UserSchema } from "@/app/contracts/responses";
import { demoUserRecord } from "../demoUser";
import { DEMO_USER_ID } from "../fake/seed";

describe("demoUserRecord", () => {
  it("is the constant demo identity and satisfies the real user schema", () => {
    const u = demoUserRecord(Date.parse("2026-11-16T12:00:00Z"));
    expect(u.user_id).toBe(DEMO_USER_ID);
    expect(u.email).toBe("demo@example.invalid");
    expect(UserSchema.safeParse({ ...u, theme: u.theme ?? null, enableNotifications: u.enableNotifications ?? null, soundFx: u.soundFx ?? null }).success).toBe(true);
  });
});
