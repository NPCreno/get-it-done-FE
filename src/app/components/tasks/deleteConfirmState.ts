/**
 * BUG-05: deleting a single task asks first. Pure state and copy for `useTaskDelete`, so the flow
 * is unit-tested without a DOM: request → confirm deletes that task; request → cancel deletes nothing.
 */

export interface PendingDelete {
  taskId: string;
  title: string;
}

export const DELETE_TASK_TITLE = "Delete this task?";
const TITLE_MAX = 60;

/** "\"<title>\" and its subtasks will be removed from your lists." The title is cut at 60 characters. */
export function deleteTaskDescription(title: string): string {
  const t = title.trim() || "This task";
  const shown = t.length > TITLE_MAX ? `${t.slice(0, TITLE_MAX)}…` : t;
  return `"${shown}" and its subtasks will be removed from your lists.`;
}

/** Opening the confirm replaces any earlier request (one dialog at a time). */
export function requestDelete(_current: PendingDelete | null, taskId: string, title: string): PendingDelete {
  return { taskId, title };
}

/** Confirm: closes the dialog and says which task to delete. */
export function confirmDelete(current: PendingDelete | null): { next: null; deleteTaskId: string | null } {
  return { next: null, deleteTaskId: current?.taskId ?? null };
}

/** Cancel (button, Esc or a click outside): closes the dialog, deletes nothing. */
export function cancelDelete(): { next: null; deleteTaskId: null } {
  return { next: null, deleteTaskId: null };
}
