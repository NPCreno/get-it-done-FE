import type { SharedProject } from "@/app/contracts/responses";
import type { IProject } from "@/app/interface/IProject";

/**
 * FEAT-09: a project someone shared with me, in the shape the project view and the task editor
 * take. Display only: the owner-only fields are blank, and nothing here is ever sent to the API.
 */
export function sharedAsProject(p: SharedProject): IProject {
  return {
    id: 0,
    project_id: p.project_id,
    title: p.title || "Untitled project",
    description: `Shared by @${p.owner_username}`,
    color: p.color,
    colorLabel: "",
    due_date: null,
    createdAt: "",
    updatedAt: "",
    deletedAt: null,
    user_id: "",
  };
}
