import type { TaskWindow } from "./window";

/**
 * Rule: every parameter sent to the API appears in the key with the exact
 * value sent, and no key holds a value the request does not use. `specs.ts`
 * builds each request FROM the key parameters, and a test enforces it.
 */
const u = (id: string) => ["u", id] as const;

/** Allowlisted log label for a key: never contains a key value (user id, project id, dates, months). */
export function resourceOf(key: readonly unknown[]): string {
  if (key[0] !== "u") return "unknown";
  const [, , area, a, b] = key;
  if (area === "profile") return "profile";
  if (area === "projects") return key.length > 3 ? "projects.detail" : "projects";
  if (area === "tasks") return a === "upcoming" ? "tasks.upcoming" : a === "project" ? "tasks.project" : "unknown";
  if (area === "analytics" && ["summary", "trend", "distribution", "heatmap", "streak"].includes(a as string)) {
    return `analytics.${a as string}`;
  }
  void b;
  return "unknown";
}

export const qk = {
  profile: (id: string) => [...u(id), "profile"] as const,
  projects: (id: string) => [...u(id), "projects"] as const,
  project: (id: string, projectId: string) => [...u(id), "projects", projectId] as const,
  tasks: (id: string) => [...u(id), "tasks"] as const, // prefix
  upcoming: (id: string, w: TaskWindow) => [...u(id), "tasks", "upcoming", w.start, w.end] as const,
  projectTasks: (id: string, projectId: string, w: TaskWindow) =>
    [...u(id), "tasks", "project", projectId, w.start, w.end] as const,
  analytics: (id: string) => [...u(id), "analytics"] as const, // prefix
  summary: (id: string, w: TaskWindow) => [...u(id), "analytics", "summary", w.start, w.end] as const,
  trend: (id: string, r: { start: string; end: string }) =>
    [...u(id), "analytics", "trend", r.start, r.end] as const,
  distribution: (id: string, month: string, year: string) =>
    [...u(id), "analytics", "distribution", year, month] as const,
  heatmap: (id: string, month: string, year: string) =>
    [...u(id), "analytics", "heatmap", year, month] as const,
  streak: (id: string) => [...u(id), "analytics", "streak"] as const,
};
