"use client";
import { useFormik } from "formik";
import { useCallback, useState } from "react";
import { useFormState } from "@/app/context/FormProvider";
import { toCreateTaskRequest, toUpdateTaskRequest } from "@/app/contracts/mappers";
import { createTaskSchema } from "@/app/schemas/createTaskSchema";
import type { ITask } from "@/app/interface/ITask";
import type { ITaskFormErrors } from "@/app/interface/forms/ITaskFormErrors";
import type { ITaskFormValues } from "@/app/interface/forms/ITaskFormValues";
import type { ToastController } from "@/hooks/toastController";
import { useCreateTask, useUpdateTask } from "@/lib/query/mutations";
import { settled } from "@/lib/query/unwrap";
import { outcomeOf, outcomeOfException, showToast, type SaveMode } from "./taskSaveOutcome";

const INITIAL_VALUES: ITaskFormValues = {
  title: "",
  description: "",
  due_date: null,
  project_id: "",
  project_title: "",
  project_color: "",
  priority: "Low",
  status: "Pending",
  isRecurring: false,
  repeat_every: "",
  repeat_days: [],
  start_date: null,
  end_date: null,
  project: "",
};

export interface OpenTaskEditor {
  mode: SaveMode;
  /** The task being edited (update mode). */
  task?: ITask;
  /** The project a created task belongs to. Replaced on every open; never carried over. */
  projectId?: string;
}

/**
 * The one entry point for a task editing session. `open` fully initializes (form, edited task,
 * project id and `selectedTaskData`); `close` fully clears them. This hook is the only writer of
 * `selectedTaskData`. The toast controller is the page's own instance.
 */
export function useTaskEditor(toast: ToastController) {
  const { userData, setSelectedTaskData } = useFormState();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const [session, setSession] = useState<{ open: boolean; mode: SaveMode; task: ITask | null; projectId: string | undefined }>({
    open: false,
    mode: "create",
    task: null,
    projectId: undefined,
  });
  const [isLoading, setIsLoading] = useState(false);

  const { values, errors, handleChange, setFieldValue, setFieldError, validateForm, resetForm, setSubmitting } =
    useFormik<ITaskFormValues>({
      initialValues: INITIAL_VALUES,
      validationSchema: createTaskSchema,
      validateOnChange: false, // no real-time validation
      validateOnBlur: false,
      onSubmit: () => undefined, // saves go through `submit`
    });

  const open = useCallback(
    ({ mode, task, projectId }: OpenTaskEditor) => {
      const edited = mode === "update" ? task ?? null : null;
      resetForm({
        values: edited
          ? {
              ...INITIAL_VALUES,
              title: edited.title || "",
              description: edited.description || "",
              priority: edited.priority || "",
              status: edited.status || "",
              due_date: edited.due_date || null,
              project_id: edited.project_id || "",
              isRecurring: false,
            }
          : { ...INITIAL_VALUES, status: "Pending" },
      });
      setSelectedTaskData(edited);
      setSession({ open: true, mode, task: edited, projectId });
    },
    [resetForm, setSelectedTaskData]
  );

  const close = useCallback(() => {
    resetForm({ values: INITIAL_VALUES }); // values, errors and touched
    setSelectedTaskData(null);
    setSession({ open: false, mode: "create", task: null, projectId: undefined });
  }, [resetForm, setSelectedTaskData]);

  const submit = useCallback(async () => {
    if (!userData) {
      console.error("No User data found");
      return;
    }
    const validationErrors = await validateForm(); // also puts the errors on screen
    if (Object.keys(validationErrors).length > 0) {
      setSubmitting(false);
      return;
    }
    setIsLoading(true);
    try {
      let result;
      if (session.mode === "update") {
        const taskId = session.task?.task_id;
        if (!taskId) {
          console.error("No task id to update");
          return;
        }
        result = await settled(updateTask.mutateAsync({ taskId, body: toUpdateTaskRequest(values) }));
      } else {
        result = await settled(createTask.mutateAsync(toCreateTaskRequest(values, { projectId: session.projectId })));
      }
      const outcome = outcomeOf(session.mode, result);
      showToast(toast, outcome.toast);
      if (outcome.close) close();
    } catch (error) {
      showToast(toast, outcomeOfException(error).toast);
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  }, [userData, validateForm, setSubmitting, session, updateTask, createTask, values, toast, close]);

  return {
    isOpen: session.open,
    mode: session.mode,
    isLoading,
    formik: {
      values,
      errors: errors as ITaskFormErrors,
      handleChange,
      setFieldValue,
      setFieldError,
    },
    open,
    close,
    submit,
  };
}

export type TaskEditor = ReturnType<typeof useTaskEditor>;
