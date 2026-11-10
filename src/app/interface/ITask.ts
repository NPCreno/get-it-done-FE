import type { ProjectTask, SubTask, TaskListItem } from "../contracts/responses";

/** Component-facing task: both the user list and the project list satisfy it. */
export interface ITask extends Omit<ProjectTask, "project_id"> {
  project_id: string | null;
  project_title?: TaskListItem["project_title"];
  template_id?: TaskListItem["template_id"];
  subInstances?: SubTask[] | null;
  user_id?: string;
}
