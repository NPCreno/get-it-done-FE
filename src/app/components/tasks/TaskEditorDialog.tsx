"use client";
import { useMemo } from "react";
import TaskModal, { type SharedProjectOption } from "@/app/components/modals/taskModal";
import type { IProject } from "@/app/interface/IProject";
import { useSharedProjects } from "@/lib/query/chat";
import { useSharingEnabled } from "@/lib/sharing";
import AssigneeSelect from "./AssigneeSelect";
import type { TaskEditor } from "./useTaskEditor";

/**
 * Renders the TaskModal with the editor's bindings. FEAT-09: the project picker also lists the
 * projects shared with me, and an Assignee field appears once a project is chosen (not in /demo).
 */
export default function TaskEditorDialog({
  editor,
  projects,
  preselectedProject,
}: {
  editor: TaskEditor;
  projects: IProject[];
  preselectedProject?: IProject | null;
}) {
  const sharingEnabled = useSharingEnabled();
  const shared = useSharedProjects({ enabled: sharingEnabled && editor.isOpen });
  const sharedProjects = useMemo<SharedProjectOption[]>(
    () =>
      (shared.data ?? []).map((p) => ({
        project_id: p.project_id,
        title: p.title,
        color: p.color,
        owner_username: p.owner_username,
      })),
    [shared.data]
  );

  if (!editor.isOpen) return null;
  const { values, setFieldValue } = editor.formik;
  return (
    <TaskModal
      onClose={editor.close}
      formik={editor.formik}
      handleCreateTask={editor.submit}
      handleUpdateTask={editor.submit}
      project={projects}
      sharedProjects={sharingEnabled ? sharedProjects : []}
      assigneeField={
        <AssigneeSelect
          projectId={editor.assigneeProjectId}
          value={values.assignee_id ?? ""}
          onChange={(id) => setFieldValue("assignee_id", id)}
          isRecurring={editor.mode === "create" && values.isRecurring === true}
          disabled={editor.isLoading}
        />
      }
      preselectedProject={preselectedProject}
      isUpdate={editor.mode === "update"}
      isLoading={editor.isLoading}
    />
  );
}
