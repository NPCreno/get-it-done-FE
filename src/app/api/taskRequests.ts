import { CreateSubTaskDto } from "../interface/dto/create-subTask-dto";
import { CreateTaskDto } from "../interface/dto/create-task-dto";
import { UpdateTaskDto } from "../interface/dto/update-task-dto";
import { ITask } from "../interface/ITask";
import { IDashboardData } from "../interface/IDashboardData";
import { ITaskCompletionTrendData } from "../interface/ITaskCompletionTrendData";
import { ITaskDistribution } from "../interface/ITaskDistribution";
import { IHeatmapData } from "../interface/IHeatmapData";
import { apiClient, apiPath } from "@/lib/apiClient";

interface CallOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export const createTaskApi = (payload: CreateTaskDto) =>
  apiClient("/tasks/create", {
    method: "POST",
    body: payload,
    fallbackError: "Failed to create task",
  });

export const updateTaskApi = (payload: UpdateTaskDto) =>
  apiClient(apiPath`/tasks/${payload.task_id ?? ""}`, {
    method: "PATCH",
    body: payload,
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
  apiClient<ITask[]>(apiPath`/tasks/getTasksByUser/${userId}`, {
    query: { startDate, endDate },
    fallbackError: "Failed to load tasks",
  });

// The backend returns a raw array here, not an envelope.
export const getTasksByProject = (project_id: string, startDate: string, endDate: string) =>
  apiClient<ITask[]>(apiPath`/tasks/getTasksByProj/${project_id}`, {
    query: { startDate, endDate },
    expect: "raw",
    fallbackError: "Failed to load project tasks",
  });

export const getDashboardData = (userId: string, startDate: string, endDate: string) =>
  apiClient<IDashboardData>(apiPath`/tasks/getDashboardData/${userId}`, {
    query: { startDate, endDate },
    fallbackError: "Failed to load dashboard",
  });

export const getTaskCompletionTrend = (userId: string, startDate: string, endDate: string) =>
  apiClient<ITaskCompletionTrendData[]>(apiPath`/tasks/completion-trend/${userId}`, {
    query: { startDate, endDate },
    fallbackError: "Failed to load completion trend",
  });

export const getTaskDistributionData = (userId: string, month: string, year: string) =>
  apiClient<ITaskDistribution[]>(apiPath`/tasks/task-distribution/${userId}`, {
    query: { month, year },
    fallbackError: "Failed to load task distribution",
  });

export const getCalendarHeatmap = (userId: string, month: string, year: string) =>
  apiClient<IHeatmapData[]>(apiPath`/tasks/calendar-heatmap/${userId}`, {
    query: { month, year },
    fallbackError: "Failed to load activity heatmap",
  });

export const getStreakCount = (userId: string) =>
  apiClient<{ count: number }>(apiPath`/tasks/streak/${userId}`, {
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

export const createSubTaskApi = (payload: CreateSubTaskDto) =>
  apiClient("/tasks/createSubTask", {
    method: "POST",
    body: payload,
    fallbackError: "Failed to create subtask",
  });
