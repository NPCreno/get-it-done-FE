import { CreateProjectDto } from "../interface/dto/create-project-dto";
import { UpdateProjectDto } from "../interface/dto/update-project-dto";
import { IProject } from "../interface/IProject";
import { apiClient, apiPath } from "@/lib/apiClient";

export const createProject = (payload: CreateProjectDto) =>
  apiClient("/projects/create", {
    method: "POST",
    body: payload,
    fallbackError: "Failed to create project",
  });

export const getProjectsForUser = (userId: string) =>
  apiClient<IProject[]>(apiPath`/projects/getAll/${userId}`, {
    fallbackError: "Failed to load projects",
  });

export const getProjectById = (projectId: string, opts?: { signal?: AbortSignal }) =>
  apiClient<IProject>(apiPath`/projects/${projectId}`, {
    signal: opts?.signal,
    fallbackError: "Failed to load project",
  });

export const updateProject = (payload: UpdateProjectDto) => {
  // Only the fields defined in UpdateProjectDto are sent
  const cleanPayload: Partial<UpdateProjectDto> = {
    title: payload.title,
    description: payload.description,
    due_date: payload.due_date,
    color: payload.color,
    project_id: payload.project_id,
    colorLabel: payload.colorLabel,
  };
  return apiClient(apiPath`/projects/${payload.project_id ?? ""}`, {
    method: "PATCH",
    body: cleanPayload,
    fallbackError: "Failed to update project",
  });
};

export const deleteProjectById = (projectId: string) =>
  apiClient(apiPath`/projects/${projectId}`, {
    method: "DELETE",
    fallbackError: "Failed to delete project",
  });
