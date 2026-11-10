/**
 * FE literals for the backend contract. TypeScript needs them as literal
 * types, so they live here and a test (`__tests__/api-contract.test.ts`)
 * compares them with the vendored `api-contract.json` (a copy of the BE
 * export; refresh it with `pnpm contract:sync`).
 */
export const TASK_PRIORITIES = ["Low", "Medium", "High"] as const;
export const TASK_STATUSES = ["Pending", "Complete", "Overdue"] as const;
export const NEW_TASK_STATUSES = ["Pending", "Complete"] as const;
export const REPEAT_EVERY = ["Day", "Week", "Month"] as const;
export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
export const THEMES = ["light", "dark"] as const;
export const BOOLEAN_STRINGS = ["true", "false"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type NewTaskStatus = (typeof NEW_TASK_STATUSES)[number];
export type RepeatEvery = (typeof REPEAT_EVERY)[number];
export type Weekday = (typeof WEEKDAYS)[number];
export type Theme = (typeof THEMES)[number];
export type BooleanString = (typeof BOOLEAN_STRINGS)[number];

/** Narrow an arbitrary string to a member of a literal list, or undefined. */
export function narrow<T extends string>(list: readonly T[], value: unknown): T | undefined {
  return typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : undefined;
}
