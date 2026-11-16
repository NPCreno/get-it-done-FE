"use client";
import { useState, type RefObject } from "react";
import { focusFallback } from "@/lib/focusFallback";
import { isUserFacing } from "@/lib/apiClient";
import { useDeleteRecurringTasks, useDeleteTask } from "@/lib/query/mutations";
import { settled } from "@/lib/query/unwrap";
import type { ToastController } from "@/hooks/toastController";
import type { TaskEditor } from "./useTaskEditor";

/**
 * Single and recurring task deletion. The caller owns the toast controller and the editor;
 * `headingRef` is where focus goes if the delete removes the button that opened the dialog.
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

  const deleteTask = async (taskId: string) => {
    try {
      const response = await settled(deleteTaskMutation.mutateAsync(taskId));
      if (response.ok) {
        editor.close();
        focusFallback(headingRef);
        toast.success("Task Deleted", "Your task has been deleted successfully", response.data.message);
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
    deleteTask,
    requestRecurringDelete,
    confirmation: {
      open: showConfirmation,
      close: () => setShowConfirmation(false),
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
