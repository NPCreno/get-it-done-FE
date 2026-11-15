import type { TaskPriority, TaskStatus } from "@/app/contracts/enums";
import { DEMO_USER_ID, type Seed } from "./seed";

export interface ProjectRow {
  id: number;
  project_id: string;
  title: string;
  description: string;
  color: string;
  colorLabel: string;
  due: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface SubTaskRow {
  id: number;
  taskSubInstance_id: string;
  title: string;
  status: TaskStatus;
  due: number | null;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface TaskRow {
  id: number;
  task_id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due: number | null;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  project_id: string | null;
  template_id: string | null;
  subtasks: SubTaskRow[];
}

/**
 * One store instance per runtime generation. All mutable state lives on the instance
 * (no module-level state). A retired store refuses writes.
 */
export interface DemoStore {
  readonly generation: number;
  readonly userId: string;
  readonly projects: ProjectRow[];
  readonly tasks: TaskRow[];
  retired: boolean;
  nextId(kind: "task" | "subtask"): number;
  retire(): void;
}

export function createDemoStore(seed: Seed, generation = 1): DemoStore {
  const projects: ProjectRow[] = seed.projects.map((p, i) => ({
    id: i + 1,
    project_id: `demo-project-${i + 1}`,
    title: p.title,
    description: p.description,
    color: p.color,
    colorLabel: p.colorLabel,
    due: p.due,
    createdAt: p.createdAt,
    updatedAt: p.createdAt,
  }));
  const counters = { task: 0, subtask: 0 };
  const nextId = (kind: "task" | "subtask") => ++counters[kind];

  const tasks: TaskRow[] = seed.tasks.map((t) => {
    const id = nextId("task");
    return {
      id,
      task_id: `demo-task-${id}`,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      due: t.due,
      createdAt: t.createdAt,
      updatedAt: t.completedAt ?? t.createdAt,
      completedAt: t.completedAt,
      project_id: t.projectIndex === null ? null : projects[t.projectIndex].project_id,
      template_id: t.templateId,
      subtasks: t.subtasks.map((s) => {
        const sid = nextId("subtask");
        return {
          id: sid,
          taskSubInstance_id: `demo-subtask-${sid}`,
          title: s.title,
          status: s.status,
          due: s.due,
          createdAt: t.createdAt,
          updatedAt: s.completedAt ?? t.createdAt,
          completedAt: s.completedAt,
        };
      }),
    };
  });

  const store: DemoStore = {
    generation,
    userId: DEMO_USER_ID,
    projects,
    tasks,
    retired: false,
    nextId,
    retire() {
      store.retired = true;
    },
  };
  return store;
}
