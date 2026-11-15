import type { TaskPriority, TaskStatus } from "@/app/contracts/enums";
import { DAY_MS, HOUR_MS, utcDay, type Clock } from "./clock";

/**
 * A plain snapshot of the demo data, everything relative to `clock.now()` so the demo
 * always has an upcoming task, an overdue task, a task completed today and a streak,
 * whatever moment it loads. No real names or emails.
 */
export const DEMO_USER_ID = "demo-user";

export const DEMO_USER = {
  user_id: DEMO_USER_ID,
  fullname: "Demo User",
  username: "demo",
  email: "demo@example.invalid",
  theme: "light",
} as const;

export interface SeedSubTask {
  title: string;
  status: TaskStatus;
  due: number | null;
  completedAt: number | null;
}

export interface SeedTask {
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due: number | null;
  createdAt: number;
  completedAt: number | null;
  projectIndex: number | null;
  templateId: string | null;
  subtasks: SeedSubTask[];
}

export interface SeedProject {
  title: string;
  description: string;
  color: string;
  colorLabel: string;
  createdAt: number;
  due: number | null;
}

export interface Seed {
  user: typeof DEMO_USER;
  projects: SeedProject[];
  tasks: SeedTask[];
}

const MIN = 60_000;

export function buildSeed(clock: Clock): Seed {
  const now = clock.now();
  const today = utcDay(now);
  const created = now - 7 * DAY_MS;

  const projects: SeedProject[] = [
    { title: "Website Launch", description: "Sample project", color: "#4F46E5", colorLabel: "Indigo", createdAt: now - 40 * DAY_MS, due: now + 14 * DAY_MS },
    { title: "Home & Life", description: "Sample project", color: "#16A34A", colorLabel: "Green", createdAt: now - 39 * DAY_MS, due: null },
    { title: "Learning Plan", description: "Sample project with nothing completed yet", color: "#EA580C", colorLabel: "Orange", createdAt: now - 38 * DAY_MS, due: now + 30 * DAY_MS },
  ];

  const task = (t: Partial<SeedTask> & Pick<SeedTask, "title">): SeedTask => ({
    description: null,
    priority: "Medium",
    status: "Pending",
    due: null,
    createdAt: created,
    completedAt: null,
    projectIndex: null,
    templateId: null,
    subtasks: [],
    ...t,
  });
  const sub = (title: string, status: TaskStatus, due: number | null, completedAt: number | null = null): SeedSubTask => ({
    title,
    status,
    due,
    completedAt,
  });

  const tasks: SeedTask[] = [
    // Upcoming: inside the rolling 24h window.
    task({
      title: "Review the launch checklist",
      description: "Walk through every item before the release.",
      priority: "High",
      due: now + 2 * HOUR_MS,
      projectIndex: 0,
      subtasks: [
        sub("Check the copy", "Complete", now + HOUR_MS, now - 10 * MIN),
        sub("Test the sign-up flow", "Pending", now + 2 * HOUR_MS),
        sub("Confirm the analytics events", "Pending", now + 2 * HOUR_MS),
      ],
    }),
    task({
      title: "Plan the week's meals",
      priority: "Low",
      due: now + 5 * HOUR_MS,
      projectIndex: 1,
      subtasks: [sub("Make a shopping list", "Pending", null), sub("Order groceries", "Pending", null)],
    }),
    task({ title: "Read two chapters", priority: "Medium", due: now + 20 * HOUR_MS, projectIndex: 2 }),
    // Overdue, still Pending.
    task({ title: "Send the invoice", priority: "High", due: now - 26 * HOUR_MS, projectIndex: 0 }),
    task({ title: "Book a dentist appointment", priority: "Low", due: now - 3 * DAY_MS, projectIndex: 1 }),
    // Completed today (never in the future, always today in UTC).
    task({
      title: "Morning workout",
      priority: "Medium",
      status: "Complete",
      due: now + 3 * HOUR_MS,
      completedAt: Math.max(today, now - MIN),
      projectIndex: 1,
    }),
    // Recurring template: yesterday (complete), in the window (pending), outside the window.
    task({ title: "Daily review", priority: "Low", status: "Complete", due: now - DAY_MS, completedAt: now - DAY_MS + 30 * MIN, projectIndex: 0, templateId: "TMP-demo-1" }),
    task({ title: "Daily review", priority: "Low", due: now + 4 * HOUR_MS, projectIndex: 0, templateId: "TMP-demo-1" }),
    task({ title: "Daily review", priority: "Low", due: now + 30 * HOUR_MS, projectIndex: 0, templateId: "TMP-demo-1" }),
  ];

  // History: one completion on each of the 4 previous UTC days (streak >= 5 with today's),
  // then scattered completions back about six weeks. Project 3 never gets one.
  const history: number[] = [];
  for (let k = 1; k <= 4; k++) history.push(today - k * DAY_MS + 12 * HOUR_MS);
  for (const d of [6, 8, 9, 12, 15, 16, 20, 23, 27, 30, 34, 38, 41]) history.push(today - d * DAY_MS + 10 * HOUR_MS);
  history.forEach((at, i) =>
    tasks.push(
      task({
        title: `Completed task ${i + 1}`,
        priority: (["Low", "Medium", "High"] as const)[i % 3],
        status: "Complete",
        due: at,
        createdAt: at - DAY_MS,
        completedAt: at,
        projectIndex: i % 2,
      })
    )
  );

  return { user: DEMO_USER, projects, tasks };
}
