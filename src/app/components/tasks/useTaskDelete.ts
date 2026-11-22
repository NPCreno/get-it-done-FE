"use client";
import { useState, type RefObject } from "react";
import { focusFallback } from "@/lib/focusFallback";
import { isUserFacing } from "@/lib/apiClient";
import { useDeleteRecurringTasks, useDeleteTask } from "@/lib/query/mutations";
import { settled } from "@/lib/query/unwrap";
import type { ToastController } from "@/hooks/toastController";
import {
  cancelDelete,
  confirmDelete,
  DELETE_TASK_TITLE,
  deleteTaskDescription,
  requestDelete as requestDeleteState,
  type PendingDelete,
} from "./deleteConfirmState";
import type { TaskEditor } from "./useTaskEditor";

/**
 * Single and recurring task deletion. The caller owns the toast controller and the editor;
 * `headingRef` is where focus goes if the delete removes the button that opened the dialog.
 *
 * BUG-05: a single delete always asks first. `requestDelete(taskId, title)` opens the confirm
 * (`deleteConfirmation`, rendered by `TaskDeleteConfirm`); only its Delete runs the request. The
 * function that deletes is private to this hook, so no call site can skip the confirm. The
 * recurring "this one or all" dialog is its own confirm.
 */
export function useTaskDelete(
  toast: ToastController,
  editor: Pick<TaskEditor, "close">,
  headingRef: RefObject<HTMLElement | null>
) {
  const deleteTaskMutation = useDeleteTask();
  const deleteRecurringMutation = useDeleteRecurringTasks();
  const [taskTemplateIdToDelete, setTaskTemplateIdToDelete] = useState<string>("");
  const [taskIdToDelete, setTaskIdToDelete] = useState<string>("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pending, setPending] = useState<PendingDelete | null>(null);

  const deleteTask = async (taskId: string) => {
    try {
      const response = await settled(deleteTaskMutation.mutateAsync(taskId));
      if (response.ok) {
        editor.close();
        focusFallback(headingRef);
        toast.success("Task Deleted", "Your task has been deleted successfully");
      } else if (isUserFacing(response.failure)) {
        if (response.failure.kind === "api") {
          editor.close();
        }
        toast.failure(response.failure);
      }
    } catch (error) {
      toast.unexpected(error);
    }
  };

  /** Opens "Delete this task?". Nothing is deleted until its Delete is chosen. */
  const requestDelete = (taskId: string, title: string) => setPending((p) => requestDeleteState(p, taskId, title));

  // Opens the "this one or all" dialog for a recurring task.
  const requestRecurringDelete = (taskTemplateId: string, taskId: string) => {
    setTaskTemplateIdToDelete(taskTemplateId);
    setTaskIdToDelete(taskId);
    setShowConfirmation(true);
  };

  const confirmDeleteRecurring = async () => {
    if (taskTemplateIdToDelete) {
      try {
        const result = await settled(deleteRecurringMutation.mutateAsync(taskTemplateIdToDelete));
        if (!result.ok) throw new Error(result.failure.message);
        focusFallback(headingRef);
        toast.success("Success", "Recurring tasks deleted successfully");
      } catch (error) {
        console.error("Failed to delete recurring tasks:", error);
        toast.error("Error", "Failed to delete recurring tasks");
      }
      setShowConfirmation(false);
      setTaskTemplateIdToDelete("");
    }
  };

  return {
    requestDelete,
    requestRecurringDelete,
    deleteConfirmation: {
      open: pending !== null,
      title: DELETE_TASK_TITLE,
      description: pending ? deleteTaskDescription(pending.title) : "",
      confirm: () => {
        const { next, deleteTaskId } = confirmDelete(pending);
        setPending(next);
        if (deleteTaskId) void deleteTask(deleteTaskId);
      },
      cancel: () => setPending(cancelDelete().next),
    },
    confirmation: {
      open: showConfirmation,
      close: () => setShowConfirmation(false),
      // The recurring dialog already asked, so "this one" deletes directly.
      deleteThisOnly: () => {
        void deleteTask(taskIdToDelete);
        setShowConfirmation(false);
      },
      deleteAll: () => {
        void confirmDeleteRecurring();
        setShowConfirmation(false);
      },
    },
  };
}

export type TaskDeleteFlow = ReturnType<typeof useTaskDelete>;
