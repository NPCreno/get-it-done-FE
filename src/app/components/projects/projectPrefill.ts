import type { ProjectFormValues } from "@/app/contracts/forms";
import type { IProject } from "@/app/interface/IProject";

/** The project form when nothing is loaded into it. */
export const EMPTY_PROJECT_FORM: ProjectFormValues = {
  title: "",
  description: "",
  due_date: null,
  colorLabel: "",
  color: "",
};

export interface PrefillInput {
  /** `project_id` of the project the query holds right now, if any. */
  loadedId: string | undefined;
  /** The project this editing session edits; undefined when creating or closed. */
  editingId: string | undefined;
  /** This editing session was already filled once. */
  sessionPrefilled: boolean;
  /** The user has changed a field in this session. */
  dirty: boolean;
}

/**
 * The project form is filled from the project query once per editing session, when that
 * project's data first arrives (#55, plan 15 §7a D). Never on a later refetch, never over the
 * user's edits, never with another project's data, and never while creating or closed.
 */
export function shouldPrefill({ loadedId, editingId, sessionPrefilled, dirty }: PrefillInput): boolean {
  return !!editingId && loadedId === editingId && !sessionPrefilled && !dirty;
}

/** Form values from a loaded project (the schema already turns null text columns into ""). */
export function projectFormValuesOf(
  project: Pick<IProject, "title" | "description" | "due_date" | "colorLabel" | "color">
): ProjectFormValues {
  return {
    title: project.title,
    description: project.description,
    due_date: project.due_date ?? null,
    colorLabel: project.colorLabel,
    color: project.color,
  };
}
