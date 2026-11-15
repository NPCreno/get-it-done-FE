import type { UserRecord } from "@/app/contracts/responses";
import { DEMO_USER, DEMO_USER_ID } from "./fake/seed";

/** The demo identity as the app's user shape. Constant; never sent anywhere. */
export function demoUserRecord(now: number): UserRecord {
  const at = new Date(now).toISOString();
  return {
    id: 0,
    user_id: DEMO_USER_ID,
    fullname: DEMO_USER.fullname,
    username: DEMO_USER.username,
    email: DEMO_USER.email,
    tier: "free",
    theme: DEMO_USER.theme,
    enableNotifications: "false",
    soundFx: "false",
    role: null,
    status: null,
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    premiumExpiry: null,
    lastLoginAt: null,
    loginAttempts: null,
  };
}
