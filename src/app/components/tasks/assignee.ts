import type { ChatMembers } from "@/app/contracts/responses";

/**
 * FEAT-09 pure rules for task assignment: the select's options and visibility, the edit-save
 * decision and the row labels. Who may delete or assign is decided by the server, never here.
 */

/** The form value for "Unassigned". */
export const UNASSIGNED = "";

export const RECURRING_ASSIGNEE_HINT = "Each repeat starts unassigned.";
export const ASSIGNEE_PARTIAL_FAILURE = "Task saved, but the assignee couldn't be changed.";

export interface AssigneeOption {
  value: string;
  label: string;
}

/** Unassigned, then the owner, then the members (no duplicates); me marked "(you)". */
export function assigneeOptions(people: ChatMembers | undefined, meId: string | undefined): AssigneeOption[] {
  const options: AssigneeOption[] = [{ value: UNASSIGNED, label: "Unassigned" }];
  if (!people) return options;
  const seen = new Set<string>();
  for (const p of [people.owner, ...people.members]) {
    if (seen.has(p.user_id)) continue;
    seen.add(p.user_id);
    options.push({ value: p.user_id, label: p.user_id === meId ? `${p.username} (you)` : p.username });
  }
  return options;
}

/** The select shows only for a chosen project, never for a recurring task, and not in the demo. */
export function showAssigneeSelect(v: { projectId: string | undefined; isRecurring: boolean; sharingEnabled: boolean }): boolean {
  return v.sharingEnabled && !!v.projectId && !v.isRecurring;
}

/** The recurring hint shows instead of the select when a recurring task has a project. */
export function showRecurringAssigneeHint(v: { projectId: string | undefined; isRecurring: boolean; sharingEnabled: boolean }): boolean {
  return v.sharingEnabled && !!v.projectId && v.isRecurring;
}

/**
 * Edit save: whether to call `PATCH /tasks/:id/assignee` after the field update. Only when the task
 * has a project and the chosen assignee differs from the one it had.
 */
export function assigneeChange(
  original: string | null | undefined,
  chosen: string | undefined,
  projectId: string | null | undefined
): { changed: false } | { changed: true; assigneeId: string | null } {
  if (!projectId || chosen === undefined) return { changed: false };
  const next = chosen === UNASSIGNED ? null : chosen;
  return (original ?? null) === next ? { changed: false } : { changed: true, assigneeId: next };
}

/** Up to two initials from a username ("ana.cruz" -> "AC", "bo" -> "BO"). */
export function initialsOf(username: string): string {
  const parts = username.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] ?? username).slice(0, 2).toUpperCase() || "?";
}

/** The row chip: nothing when unassigned; "You" when it's me, else "Assigned to <username>". */
export function assigneeChip(
  task: { assignee_id?: string | null; assignee_username?: string | null },
  meId: string | undefined
): { initials: string; text: string } | null {
  if (!task.assignee_id) return null;
  const name = task.assignee_username || "someone";
  return { initials: initialsOf(name), text: task.assignee_id === meId ? "You" : `Assigned to ${name}` };
}

/** "in <project> · <owner>" for a task from someone else's project, else null. */
export function sharedProjectLabel(task: { project_title?: string | null; project_owner_username?: string | null }): string | null {
  if (!task.project_owner_username) return null;
  return `in ${task.project_title || "a shared project"} · ${task.project_owner_username}`;
}

/** Whether to offer Delete: exactly the server's `can_delete` (absent from an old backend = yes). */
export function canDeleteTask(task: { can_delete?: boolean }): boolean {
  return task.can_delete !== false;
}

/** A different project has different people, so the assignee starts over; the same one keeps it. */
export function assigneeAfterProjectChange(previousProjectId: string, nextProjectId: string, assignee: string): string {
  return previousProjectId === nextProjectId ? assignee : UNASSIGNED;
}
