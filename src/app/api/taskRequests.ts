import { apiClient, apiPath } from "@/lib/apiClient";
import {
  DashboardDataSchema,
  DistributionSchema,
  HeatmapCellSchema,
  ProjectTaskSchema,
  StreakSchema,
  TaskListItemSchema,
  TrendPointSchema,
} from "../contracts/responses";
import {
  CreateSubTaskRequestSchema,
  CreateTaskRequestSchema,
  UpdateTaskRequestSchema,
} from "../contracts/requests";
import type { CreateSubTaskDraft, CreateTaskDraft, UpdateTaskDraft } from "../contracts/mappers";

interface CallOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

// The owner comes from the token; nothing here takes a user id for writes.
export const createTaskApi = (payload: CreateTaskDraft) =>
  apiClient("/tasks/create", {
    method: "POST",
    body: payload,
    requestSchema: CreateTaskRequestSchema,
    fallbackError: "Failed to create task",
  });

export const updateTaskApi = (taskId: string, payload: UpdateTaskDraft) =>
  apiClient(apiPath`/tasks/${taskId}`, {
    method: "PATCH",
    body: payload,
    requestSchema: UpdateTaskRequestSchema,
    fallbackError: "Failed to update task",
  });

export const deleteTaskApi = (taskId: string) =>
  apiClient(apiPath`/tasks/${taskId}`, {
    method: "DELETE",
    fallbackError: "Failed to delete task",
  });

export const deleteSubTaskApi = (taskSubInstance_id: string) =>
  apiClient(apiPath`/tasks/subTask/${taskSubInstance_id}`, {
    method: "DELETE",
    fallbackError: "Failed to delete subtask",
  });

export const deleteRecurringTasksApi = (taskTemplate_id: string) =>
  apiClient(apiPath`/tasks/deleteRecurringTasks/${taskTemplate_id}`, {
    method: "DELETE",
    fallbackError: "Failed to delete recurring tasks",
  });

export const getTasksByUser = (userId: string, startDate: string, endDate: string) =>
  apiClient(apiPath`/tasks/getTasksByUser/${userId}`, {
    query: { startDate, endDate },
    schema: TaskListItemSchema.array(),
    fallbackError: "Failed to load tasks",
  });

// The backend returns a raw array here, not an envelope.
export const getTasksByProject = (project_id: string, startDate: string, endDate: string) =>
  apiClient(apiPath`/tasks/getTasksByProj/${project_id}`, {
    query: { startDate, endDate },
    expect: "raw",
    schema: ProjectTaskSchema.array(),
    fallbackError: "Failed to load project tasks",
  });

export const getDashboardData = (userId: string, startDate: string, endDate: string) =>
  apiClient(apiPath`/tasks/getDashboardData/${userId}`, {
    query: { startDate, endDate },
    schema: DashboardDataSchema,
    fallbackError: "Failed to load dashboard",
  });

export const getTaskCompletionTrend = (userId: string, startDate: string, endDate: string) =>
  apiClient(apiPath`/tasks/completion-trend/${userId}`, {
    query: { startDate, endDate },
    schema: TrendPointSchema.array(),
    fallbackError: "Failed to load completion trend",
  });

export const getTaskDistributionData = (userId: string, month: string, year: string) =>
  apiClient(apiPath`/tasks/task-distribution/${userId}`, {
    query: { month, year },
    schema: DistributionSchema.array(),
    fallbackError: "Failed to load task distribution",
  });

export const getCalendarHeatmap = (userId: string, month: string, year: string) =>
  apiClient(apiPath`/tasks/calendar-heatmap/${userId}`, {
    query: { month, year },
    schema: HeatmapCellSchema.array(),
    fallbackError: "Failed to load activity heatmap",
  });

export const getStreakCount = (userId: string) =>
  apiClient(apiPath`/tasks/streak/${userId}`, {
    schema: StreakSchema,
    fallbackError: "Failed to load streak",
  });

export const updateTaskStatus = (taskId: string, status: string, opts?: CallOptions) =>
  apiClient<void>(apiPath`/tasks/update-task-status/${taskId}/status/${status}`, {
    method: "PATCH",
    signal: opts?.signal,
    timeoutMs: opts?.timeoutMs,
    allowEmpty: true,
    fallbackError: "Failed to update task status",
  });

export const updateSubTaskStatus = (taskSubInstance_id: string, status: string, opts?: CallOptions) =>
  apiClient<void>(apiPath`/tasks/update-subTask-status/${taskSubInstance_id}/status/${status}`, {
    method: "PATCH",
    signal: opts?.signal,
    timeoutMs: opts?.timeoutMs,
    allowEmpty: true,
    fallbackError: "Failed to update subtask status",
  });

export const createSubTaskApi = (payload: CreateSubTaskDraft) =>
  apiClient("/tasks/createSubTask", {
    method: "POST",
    body: payload,
    requestSchema: CreateSubTaskRequestSchema,
    fallbackError: "Failed to create subtask",
  });
