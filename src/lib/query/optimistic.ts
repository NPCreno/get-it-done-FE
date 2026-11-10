import type { TaskStatus } from "@/app/contracts/enums";

/** The subset of a task that status patches touch. User lists and project lists both fit. */
export interface TaskLike {
  task_id: string;
  status: TaskStatus;
  subInstances?: { taskSubInstance_id: string; status: TaskStatus }[] | null;
}

export interface StatusPatch {
  taskId: string;
  /** Task status, or the parent change that follows a subtask change. */
  task?: { from: TaskStatus; to: TaskStatus };
  subtask?: { id: string; from: TaskStatus; to: TaskStatus };
}

/** Immutable. Returns the same array when nothing changed. */
export function applyPatch<T extends TaskLike>(list: T[] | undefined, patch: StatusPatch): T[] | undefined {
  return mapTask(list, patch.taskId, (t) => {
    let next = t;
    if (patch.task && next.status !== patch.task.to) next = { ...next, status: patch.task.to };
    if (patch.subtask && next.subInstances) {
      const sub = patch.subtask;
      const subs = next.subInstances.map((s) =>
        s.taskSubInstance_id === sub.id && s.status !== sub.to ? { ...s, status: sub.to } : s
      );
      if (subs.some((s, i) => s !== next.subInstances![i])) next = { ...next, subInstances: subs };
    }
    return next;
  });
}

/**
 * Compare-and-swap: restores `from` ONLY where the current value still equals
 * `to`, and only for this patch's own task and subtask. Another task's
 * optimistic change, or a value something later already changed, is untouched.
 */
export function revertPatch<T extends TaskLike>(list: T[] | undefined, patch: StatusPatch): T[] | undefined {
  return mapTask(list, patch.taskId, (t) => {
    let next = t;
    if (patch.task && next.status === patch.task.to) next = { ...next, status: patch.task.from };
    if (patch.subtask && next.subInstances) {
      const sub = patch.subtask;
      const subs = next.subInstances.map((s) =>
        s.taskSubInstance_id === sub.id && s.status === sub.to ? { ...s, status: sub.from } : s
      );
      if (subs.some((s, i) => s !== next.subInstances![i])) next = { ...next, subInstances: subs };
    }
    return next;
  });
}

function mapTask<T extends TaskLike>(list: T[] | undefined, taskId: string, fn: (t: T) => T): T[] | undefined {
  if (!Array.isArray(list)) return list;
  let changed = false;
  const out = list.map((t) => {
    if (t.task_id !== taskId) return t;
    const n = fn(t);
    if (n !== t) changed = true;
    return n;
  });
  return changed ? out : list;
}

export function findTask<T extends TaskLike>(lists: (T[] | undefined)[], taskId: string): T | undefined {
  for (const l of lists) {
    const hit = Array.isArray(l) ? l.find((t) => t.task_id === taskId) : undefined;
    if (hit) return hit;
  }
  return undefined;
}

/** Task status change. `fallbackFrom` is used when the task is in no cached list. */
export function planTaskStatus(
  task: TaskLike | undefined,
  taskId: string,
  to: TaskStatus,
  fallbackFrom?: TaskStatus
): StatusPatch {
  const from = task?.status ?? fallbackFrom;
  return from && from !== to ? { taskId, task: { from, to } } : { taskId };
}

/**
 * Subtask status change plus the existing parent rule: all subtasks complete
 * -> parent Complete; parent was Complete and a subtask became Pending ->
 * parent Pending. Without the parent in the cache there is no parent change.
 */
export function planSubtaskStatus(task: TaskLike | undefined, taskId: string, subId: string, to: TaskStatus): StatusPatch {
  const sub = task?.subInstances?.find((s) => s.taskSubInstance_id === subId);
  const patch: StatusPatch = { taskId };
  if (!task || !sub) return patch;
  if (sub.status !== to) patch.subtask = { id: subId, from: sub.status, to };

  const after = task.subInstances!.map((s) => (s.taskSubInstance_id === subId ? to : s.status));
  const allComplete = after.every((s) => s === "Complete");
  if (allComplete || task.status === "Complete") {
    const parentTo: TaskStatus = allComplete ? "Complete" : "Pending";
    if (parentTo !== task.status) patch.task = { from: task.status, to: parentTo };
  }
  return patch;
}
