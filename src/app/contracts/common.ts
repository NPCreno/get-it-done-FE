import { z } from "zod";

export const LIMITS = {
  fullnameMin: 3,
  fullnameMax: 50,
  usernameMin: 3,
  usernameMax: 20,
  passwordMin: 6,
  passwordMax: 20,
  titleMin: 2,
  titleMax: 100,
  descriptionMax: 500,
  colorLabelMax: 50,
  notificationsPageMax: 100,
  chatMessageMax: 2000,
  chatMessagesPageMax: 50,
  chatMembersMax: 20,
} as const;

/** Regex sources, compared with the contract JSON by a test. */
export const PATTERNS = {
  username: "^[A-Za-z0-9_]+$",
  password: "[0-9]",
} as const;

/** Timestamps arrive as ISO strings. Lenient on purpose: any Date.parse-able string. */
export const ApiDate = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" });

/** Heatmap and trend dates are date-only, never a full timestamp. */
export const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

/** Analytics counts are JS numbers on the wire, never numeric strings. */
export const Count = z.number().int().nonnegative();

/** A nullable text column that the UI treats as an empty string. */
export const NullableText = z
  .string()
  .nullable()
  .transform((v) => v ?? "");

/** A nullable column the UI treats as "not set": null becomes undefined. */
export const OptionalText = z
  .string()
  .nullable()
  .transform((v) => v ?? undefined);

/** FEAT-07 personal access token rules (plan 38a §B). Not part of `LIMITS`, which mirrors the contract's `limits`. */
export const API_TOKEN_RULES = {
  nameMin: 1,
  nameMax: 60,
  /** Active tokens per user; the backend refuses an 11th. */
  maxActive: 10,
  defaultExpiryDays: 90,
  /** Every token starts with this, so a leaked one is easy to spot. */
  prefix: "gid_pat_",
} as const;
