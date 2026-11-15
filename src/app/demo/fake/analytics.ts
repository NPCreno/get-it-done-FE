import { DAY_MS, dateOnly, utcDay, type Clock } from "./clock";
import { inWindow } from "./crud";
import type { DemoStore, TaskRow } from "./store";

/**
 * Demo-only analytics, simplified on purpose (they are NOT the backend's rules):
 * - A completion counts on the UTC day its status became Complete (`completedAt`).
 * - Summary window: same rule as the task list (`inWindow`); `pending_tasks` is exactly
 *   Pending; `complete_tasks` is all-time completed.
 * - Overdue is not a status rewrite: a Pending task due before the window start is listed.
 * - Streak: consecutive UTC days with at least one completion, ending today if there is
 *   one today, otherwise yesterday (a port of the backend's computeStreak, demo-only).
 * - Boundaries are inclusive on both ends; months are UTC.
 * - Distribution: tasks completed in the month, per existing project, ordered by project
 *   creation, zero-count projects included.
 */

const completions = (store: DemoStore): TaskRow[] =>
  store.tasks.filter((t) => t.status === "Complete" && t.completedAt !== null);

export function dashboardSummary(store: DemoStore, start: number, end: number) {
  const inside = store.tasks.filter((t) => inWindow(t, start, end));
  return {
    all_tasks: inside.length,
    pending_tasks: inside.filter((t) => t.status === "Pending").length,
    complete_tasks: store.tasks.filter((t) => t.status === "Complete").length,
    all_projects: store.projects.length,
  };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** One point per UTC day from `startDay` to `endDay` (both `YYYY-MM-DD`), inclusive. */
export function completionTrend(store: DemoStore, startDay: number, endDay: number) {
  const days = new Map<string, number>();
  for (const t of completions(store)) days.set(dateOnly(t.completedAt!), (days.get(dateOnly(t.completedAt!)) ?? 0) + 1);
  const out: { date: string; day: string; completed: number }[] = [];
  for (let d = utcDay(startDay); d <= utcDay(endDay); d += DAY_MS) {
    out.push({ date: dateOnly(d), day: WEEKDAYS[new Date(d).getUTCDay()], completed: days.get(dateOnly(d)) ?? 0 });
  }
  return out;
}

const monthRange = (month: number, year: number) => ({
  start: Date.UTC(year, month - 1, 1),
  end: Date.UTC(year, month, 1), // exclusive
});

export function distribution(store: DemoStore, month: number, year: number) {
  const { start, end } = monthRange(month, year);
  const done = completions(store).filter((t) => t.completedAt! >= start && t.completedAt! < end);
  return [...store.projects]
    .sort((a, b) => a.createdAt - b.createdAt || a.id - b.id)
    .map((p) => ({
      title: p.title,
      value: done.filter((t) => t.project_id === p.project_id).length,
      fill: p.color,
    }));
}

export function heatmap(store: DemoStore, month: number, year: number) {
  const { start, end } = monthRange(month, year);
  const counts = new Map<string, number>();
  for (const t of completions(store)) {
    if (t.completedAt! >= start && t.completedAt! < end) counts.set(dateOnly(t.completedAt!), (counts.get(dateOnly(t.completedAt!)) ?? 0) + 1);
  }
  const out: { date: string; value: number }[] = [];
  for (let d = start; d < end; d += DAY_MS) out.push({ date: dateOnly(d), value: counts.get(dateOnly(d)) ?? 0 });
  return out;
}

export function streak(store: DemoStore, clock: Clock) {
  const days = new Set(completions(store).map((t) => utcDay(t.completedAt!)));
  const today = utcDay(clock.now());
  let cursor = days.has(today) ? today : today - DAY_MS;
  let count = 0;
  while (days.has(cursor)) {
    count++;
    cursor -= DAY_MS;
  }
  return { count };
}
