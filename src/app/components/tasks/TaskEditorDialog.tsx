"use client";
import TaskModal from "@/app/components/modals/taskModal";
import type { IProject } from "@/app/interface/IProject";
import type { TaskEditor } from "./useTaskEditor";

/** Renders the existing TaskModal with the editor's bindings; the modal itself is unchanged. */
export default function TaskEditorDialog({
  editor,
  projects,
  preselectedProject,
}: {
  editor: TaskEditor;
  projects: IProject[];
  preselectedProject?: IProject | null;
}) {
  if (!editor.isOpen) return null;
  return (
    <TaskModal
      onClose={editor.close}
      formik={editor.formik}
      handleCreateTask={editor.submit}
      handleUpdateTask={editor.submit}
      project={projects}
      preselectedProject={preselectedProject}
      isUpdate={editor.mode === "update"}
      isLoading={editor.isLoading}
    />
  );
}
