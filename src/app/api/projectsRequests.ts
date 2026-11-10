import { apiClient, apiPath } from "@/lib/apiClient";
import { ProjectListItemSchema, ProjectSchema } from "../contracts/responses";
import { CreateProjectRequestSchema, UpdateProjectRequestSchema } from "../contracts/requests";
import type { CreateProjectDraft, UpdateProjectDraft } from "../contracts/mappers";

// The owner comes from the token; nothing here takes a user id for writes.
export const createProject = (payload: CreateProjectDraft) =>
  apiClient("/projects/create", {
    method: "POST",
    body: payload,
    requestSchema: CreateProjectRequestSchema,
    fallbackError: "Failed to create project",
  });

export const getProjectsForUser = (userId: string, opts?: { signal?: AbortSignal }) =>
  apiClient(apiPath`/projects/getAll/${userId}`, {
    schema: ProjectListItemSchema.array(),
    signal: opts?.signal,
    fallbackError: "Failed to load projects",
  });

export const getProjectById = (projectId: string, opts?: { signal?: AbortSignal }) =>
  apiClient(apiPath`/projects/${projectId}`, {
    signal: opts?.signal,
    schema: ProjectSchema,
    fallbackError: "Failed to load project",
  });

export const updateProject = (projectId: string, payload: UpdateProjectDraft) =>
  apiClient(apiPath`/projects/${projectId}`, {
    method: "PATCH",
    body: payload,
    requestSchema: UpdateProjectRequestSchema,
    fallbackError: "Failed to update project",
  });

export const deleteProjectById = (projectId: string) =>
  apiClient(apiPath`/projects/${projectId}`, {
    method: "DELETE",
    fallbackError: "Failed to delete project",
  });
