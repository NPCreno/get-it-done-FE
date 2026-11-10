import type { Project, ProjectListItem } from "../contracts/responses";

/** `projects/getAll` rows have counts; `projects/:id` does not. */
export type IProject = Project & Partial<Pick<ProjectListItem, "task_count" | "task_completed">>;
