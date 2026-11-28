import { isUserFacing, type ApiFailure } from "@/lib/apiClient";
import type { ToastController } from "@/hooks/toastController";
import type { Settled } from "@/lib/query/unwrap";
import { ASSIGNEE_PARTIAL_FAILURE } from "./assignee";

export type SaveMode = "create" | "update";

export type ToastIntent =
  | { kind: "success"; title: string; fallback: string }
  /** FEAT-09: the task saved but a follow-up step (the assignee) did not. */
  | { kind: "warning"; title: string; message: string }
  | { kind: "failure"; failure: ApiFailure }
  | { kind: "unexpected"; error: unknown };

/**
 * What the task editor does after a save attempt. The rule: a failed save keeps the modal open and
 * the form values as they are; only a successful save closes and resets the editor.
 */
export interface SaveOutcome {
  close: boolean;
  reset: boolean;
  toast: ToastIntent | null;
}

const COPY: Record<SaveMode, { title: string; fallback: string }> = {
  create: { title: "Task Created", fallback: "Your new task has been created successfully" },
  update: { title: "Task Updated", fallback: "Your task has been updated successfully" },
};

export function outcomeOf(mode: SaveMode, result: Settled<unknown>): SaveOutcome {
  if (result.ok) {
    return { close: true, reset: true, toast: { kind: "success", ...COPY[mode] } };
  }
  // Toast only for failures the user caused or can act on (aborted and unauthorized stay silent).
  return { close: false, reset: false, toast: isUserFacing(result.failure) ? { kind: "failure", failure: result.failure } : null };
}

/**
 * FEAT-09 edit save: the field update decides the outcome. If it succeeded and the assignee call
 * then failed, the task is still saved, so the dialog closes with a warning instead.
 */
export function outcomeWithAssignee(result: Settled<unknown>, assignee: Settled<unknown> | null): SaveOutcome {
  const base = outcomeOf("update", result);
  if (!result.ok || !assignee || assignee.ok) return base;
  return { ...base, toast: { kind: "warning", title: COPY.update.title, message: ASSIGNEE_PARTIAL_FAILURE } };
}

/** An exception thrown inside the save handler: same as a failure, with the generic copy. */
export function outcomeOfException(error: unknown): SaveOutcome {
  return { close: false, reset: false, toast: { kind: "unexpected", error } };
}

export function showToast(toast: ToastController, intent: ToastIntent | null): void {
  if (!intent) return;
  if (intent.kind === "success") toast.success(intent.title, intent.fallback);
  else if (intent.kind === "warning") toast.show({ title: intent.title, description: intent.message, className: "text-th-warn-t" });
  else if (intent.kind === "failure") toast.failure(intent.failure);
  else toast.unexpected(intent.error);
}
