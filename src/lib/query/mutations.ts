import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MutationKey, QueryClient, UseMutationOptions } from "@tanstack/react-query";
import {
  createSubTaskApi,
  createTaskApi,
  deleteRecurringTasksApi,
  deleteSubTaskApi,
  deleteTaskApi,
  updateSubTaskStatus,
  updateTaskApi,
  updateTaskStatus,
} from "@/app/api/taskRequests";
import { createProject, deleteProjectById, updateProject } from "@/app/api/projectsRequests";
import { updateUser } from "@/app/api/userRequests";
import type { ApiResult } from "@/lib/apiClient";
import type { TaskStatus } from "@/app/contracts/enums";
import type {
  CreateProjectDraft,
  CreateSubTaskDraft,
  CreateTaskDraft,
  UpdateProjectDraft,
  UpdateTaskDraft,
} from "@/app/contracts/mappers";
import type { UpdateUserRequest } from "@/app/contracts/requests";
import { gatedInvalidate, invalidationsFor, type DataEvent } from "./invalidation";
import { qk } from "./keys";
import {
  applyPatch,
  findTask,
  planSubtaskStatus,
  planTaskStatus,
  revertPatch,
  type StatusPatch,
  type TaskLike,
} from "./optimistic";
import { useSessionUserId } from "./queries";
import { must, type ApiError } from "./unwrap";

export const TASK_DATA_KEY = ["taskData"] as const;
export const PROJECT_DATA_KEY = ["projectData"] as const;
export const PROFILE_DATA_KEY = ["profileData"] as const;

const STATUS_TIMEOUT_MS = 10_000;

// ------------------------------------------------------------------ generic

/** A mutation that is not optimistic: it names its event and goes through the gate. */
export function dataMutationOptions<V, R>(
  qc: QueryClient,
  userId: string,
  mutationKey: MutationKey,
  event: DataEvent,
  call: (vars: V) => Promise<ApiResult<R>>,
  scopeTaskId?: string
): UseMutationOptions<{ data: R; message?: string }, ApiError, V> {
  return {
    mutationKey,
    ...(scopeTaskId ? { scope: { id: `task:${scopeTaskId}` } } : {}),
    mutationFn: async (vars: V) => {
      const ok = must(await call(vars));
      return { data: ok.data, message: ok.message };
    },
    // Returning the promise makes isPending cover the refetch.
    onSettled: () => gatedInvalidate(qc, mutationKey, invalidationsFor(event, userId)),
  };
}

// ---------------------------------------------------------------- optimistic

export interface TaskStatusVars {
  taskId: string;
  to: TaskStatus;
  /** Used only when the task is in no cached list (e.g. the project view). */
  from?: TaskStatus;
}

export interface SubTaskStatusVars {
  taskId: string;
  subtaskId: string;
  to: TaskStatus;
}

interface Ctx {
  patch: StatusPatch;
}

/** onMutate computes the patch; mutationFn reads it back by variables identity. */
const plans = new WeakMap<object, StatusPatch>();

async function applyOptimistic(
  qc: QueryClient,
  userId: string,
  vars: object,
  build: (task: TaskLike | undefined) => StatusPatch
): Promise<Ctx> {
  await qc.cancelQueries({ queryKey: qk.tasks(userId) });
  const lists = qc.getQueriesData<TaskLike[]>({ queryKey: qk.tasks(userId) }).map(([, d]) => d);
  const patch = build(findTask(lists, (vars as { taskId: string }).taskId));
  qc.setQueriesData<TaskLike[]>({ queryKey: qk.tasks(userId) }, (list) => applyPatch(list, patch));
  plans.set(vars, patch);
  return { patch };
}

function rollback(qc: QueryClient, userId: string, patch: StatusPatch): void {
  qc.setQueriesData<TaskLike[]>({ queryKey: qk.tasks(userId) }, (list) => revertPatch(list, patch));
}

/** Per-parent `scope` serializes mutations on the same task; different tasks run concurrently. */
export function setTaskStatusOptions(
  qc: QueryClient,
  userId: string,
  parentTaskId: string
): UseMutationOptions<void, ApiError, TaskStatusVars, Ctx> {
  return {
    mutationKey: TASK_DATA_KEY,
    scope: { id: `task:${parentTaskId}` },
    mutationFn: async (vars) => {
      must(await updateTaskStatus(vars.taskId, vars.to, { timeoutMs: STATUS_TIMEOUT_MS }));
    },
    onMutate: (vars) => applyOptimistic(qc, userId, vars, (task) => planTaskStatus(task, vars.taskId, vars.to, vars.from)),
    onError: (_e, _vars, ctx) => {
      if (ctx) rollback(qc, userId, ctx.patch);
    },
    onSettled: () => gatedInvalidate(qc, TASK_DATA_KEY, invalidationsFor("task", userId)),
  };
}

export function setSubTaskStatusOptions(
  qc: QueryClient,
  userId: string,
  parentTaskId: string
): UseMutationOptions<void, ApiError, SubTaskStatusVars, Ctx> {
  return {
    mutationKey: TASK_DATA_KEY,
    scope: { id: `task:${parentTaskId}` },
    mutationFn: async (vars) => {
      const patch = plans.get(vars);
      const opts = { timeoutMs: STATUS_TIMEOUT_MS };
      must(await updateSubTaskStatus(vars.subtaskId, vars.to, opts), "subtask");
      // The parent is only touched after the subtask succeeded.
      if (patch?.task) must(await updateTaskStatus(vars.taskId, patch.task.to, opts), "parent");
    },
    onMutate: (vars) =>
      applyOptimistic(qc, userId, vars, (task) => planSubtaskStatus(task, vars.taskId, vars.subtaskId, vars.to)),
    onError: (error, _vars, ctx) => {
      if (!ctx) return;
      if (error.stage === "parent") {
        // The subtask change is on the server: keep it, revert only the parent.
        rollback(qc, userId, { taskId: ctx.patch.taskId, task: ctx.patch.task });
      } else {
        rollback(qc, userId, ctx.patch);
      }
    },
    onSettled: () => gatedInvalidate(qc, TASK_DATA_KEY, invalidationsFor("subtask-status", userId)),
  };
}

// -------------------------------------------------------------------- hooks

function useCtx() {
  const qc = useQueryClient();
  const userId = useSessionUserId() ?? "";
  return { qc, userId };
}

export function useSetTaskStatus(parentTaskId: string) {
  const { qc, userId } = useCtx();
  return useMutation(setTaskStatusOptions(qc, userId, parentTaskId));
}

export function useSetSubTaskStatus(parentTaskId: string) {
  const { qc, userId } = useCtx();
  return useMutation(setSubTaskStatusOptions(qc, userId, parentTaskId));
}

export function useCreateTask() {
  const { qc, userId } = useCtx();
  return useMutation(dataMutationOptions(qc, userId, TASK_DATA_KEY, "task", (draft: CreateTaskDraft) => createTaskApi(draft)));
}

export function useUpdateTask() {
  const { qc, userId } = useCtx();
  return useMutation(
    dataMutationOptions(qc, userId, TASK_DATA_KEY, "task", (v: { taskId: string; body: UpdateTaskDraft }) =>
      updateTaskApi(v.taskId, v.body)
    )
  );
}

export function useDeleteTask() {
  const { qc, userId } = useCtx();
  return useMutation(dataMutationOptions(qc, userId, TASK_DATA_KEY, "task", (taskId: string) => deleteTaskApi(taskId)));
}

export function useDeleteRecurringTasks() {
  const { qc, userId } = useCtx();
  return useMutation(
    dataMutationOptions(qc, userId, TASK_DATA_KEY, "task", (templateId: string) => deleteRecurringTasksApi(templateId))
  );
}

export function useCreateSubTask(parentTaskId: string) {
  const { qc, userId } = useCtx();
  return useMutation(
    dataMutationOptions(
      qc,
      userId,
      TASK_DATA_KEY,
      "subtask-structure",
      (draft: CreateSubTaskDraft) => createSubTaskApi(draft),
      parentTaskId
    )
  );
}

export function useDeleteSubTask(parentTaskId: string) {
  const { qc, userId } = useCtx();
  return useMutation(
    dataMutationOptions(
      qc,
      userId,
      TASK_DATA_KEY,
      "subtask-structure",
      (subTaskId: string) => deleteSubTaskApi(subTaskId),
      parentTaskId
    )
  );
}

export function useCreateProject() {
  const { qc, userId } = useCtx();
  return useMutation(
    dataMutationOptions(qc, userId, PROJECT_DATA_KEY, "project-saved", (draft: CreateProjectDraft) => createProject(draft))
  );
}

export function useUpdateProject() {
  const { qc, userId } = useCtx();
  return useMutation(
    dataMutationOptions(qc, userId, PROJECT_DATA_KEY, "project-saved", (v: { projectId: string; body: UpdateProjectDraft }) =>
      updateProject(v.projectId, v.body)
    )
  );
}

export function useDeleteProject() {
  const { qc, userId } = useCtx();
  return useMutation(
    dataMutationOptions(qc, userId, PROJECT_DATA_KEY, "project-deleted", (projectId: string) => deleteProjectById(projectId))
  );
}

export function useUpdateProfile() {
  const { qc, userId } = useCtx();
  return useMutation(
    dataMutationOptions(qc, userId, PROFILE_DATA_KEY, "profile", (v: { userId: string; body: UpdateUserRequest }) =>
      updateUser(v.userId, v.body)
    )
  );
}
