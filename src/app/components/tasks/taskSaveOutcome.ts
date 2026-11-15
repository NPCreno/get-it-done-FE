import { isUserFacing, type ApiFailure } from "@/lib/apiClient";
import type { ToastController } from "@/hooks/toastController";
import type { Settled } from "@/lib/query/unwrap";

export type SaveMode = "create" | "update";

export type ToastIntent =
  | { kind: "success"; title: string; fallback: string; message?: string }
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

export function outcomeOf(mode: SaveMode, result: Settled<{ message?: string }>): SaveOutcome {
  if (result.ok) {
    return { close: true, reset: true, toast: { kind: "success", ...COPY[mode], message: result.data.message } };
  }
  // Toast only for failures the user caused or can act on (aborted and unauthorized stay silent).
  return { close: false, reset: false, toast: isUserFacing(result.failure) ? { kind: "failure", failure: result.failure } : null };
}

/** An exception thrown inside the save handler: same as a failure, with the generic copy. */
export function outcomeOfException(error: unknown): SaveOutcome {
  return { close: false, reset: false, toast: { kind: "unexpected", error } };
}

export function showToast(toast: ToastController, intent: ToastIntent | null): void {
  if (!intent) return;
  if (intent.kind === "success") toast.success(intent.title, intent.fallback, intent.message);
  else if (intent.kind === "failure") toast.failure(intent.failure);
  else toast.unexpected(intent.error);
}
