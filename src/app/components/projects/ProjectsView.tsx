"use client";
import { useEffect, useRef, useState } from "react";
import { useFormState } from "@/app/context/FormProvider";
import ToastHost from "@/app/components/ToastHost";
import LoadingPage from "@/app/components/loader";
import ViewProjectModal from "@/app/components/modals/viewProject";
import ProjectChatActions from "@/app/components/chat/ProjectChatActions";
import SharedProjectsSection from "@/app/components/chat/SharedProjectsSection";
import TaskEditorDialog from "@/app/components/tasks/TaskEditorDialog";
import { useTaskEditor } from "@/app/components/tasks/useTaskEditor";
import { useTaskDelete } from "@/app/components/tasks/useTaskDelete";
import type { IProject } from "@/app/interface/IProject";
import type { ITask } from "@/app/interface/ITask";
import { useToastController } from "@/hooks/useToastController";
import { useProjects, useProjectTasks } from "@/lib/query/queries";
import { loadStateOf } from "@/lib/query/loadState";
import { isEmptyList } from "@/lib/query/emptiness";
import ProjectEditorDialog from "./ProjectEditorDialog";
import ProjectGrid from "./ProjectGrid";
import { useProjectEditor } from "./useProjectEditor";

const NO_PROJECTS: IProject[] = [];
const NO_TASKS: ITask[] = [];

/**
 * The projects page body: the grid, the project editor and the view-project flow. `/projects`
 * wraps it in `MainLayout`.
 */
export default function ProjectsView() {
  const { userData } = useFormState();
  // One toast controller for the page: the host and every handler below share it.
  const toast = useToastController();
  // The one task editor; it owns the task form and is the only writer of selectedTaskData.
  const editor = useTaskEditor(toast);
  // Where focus goes if the delete removes the button that opened the dialog.
  const headingRef = useRef<HTMLHeadingElement>(null);
  // The project form, separate from the task form.
  const projectEditor = useProjectEditor(toast, editor, headingRef);
  const { deleteTask } = useTaskDelete(toast, editor, headingRef);
  const [isViewProjectModalOpen, setIsViewProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<IProject | null>(null);
  // Server data is owned by query hooks (src/lib/query). Mutations declare what they
  // invalidate, so nothing here refetches because of a modal or a toast.
  const projectsQuery = useProjects();
  const projectData = projectsQuery.data ?? NO_PROJECTS;
  const projectOptions = projectData; // one list feeds the grid and the task-modal options
  const projectTasksQuery = useProjectTasks(selectedProject?.project_id);
  const tasks: ITask[] = projectTasksQuery.data ?? NO_TASKS;
  // Only a SUCCESSFUL empty list is "No Projects Yet"; a failure shows an error with retry.
  const projectsState = loadStateOf(projectsQuery, isEmptyList);
  const tasksState = loadStateOf(projectTasksQuery, isEmptyList);
  const pageLoading = projectsState.status === "loading";
  // Same title, description and class as before; only the timers moved into the controller.
  const setStatusError = (message: string) => toast.error("Something Went Wrong", message);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    if (!editor.isOpen && !isViewProjectModalOpen) {
      setSelectedProject(null);
    }
  }, [isViewProjectModalOpen, editor.isOpen]);

  useEffect(() => {
    if (!pageLoading) {
      setTimeout(() => setShowLoader(false), 500); // Match transition duration
    }
  }, [pageLoading]);

  return (
    <>
      <ToastHost controller={toast} />
      <div className="main flex justify-center h-full w-full">
        {/* Main Page */}
        <div className="inside flex flex-col gap-5 max-w-[1440px] w-full mx-auto">

        {showLoader && (
          <div className={`transition-opacity duration-500 ${!pageLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <LoadingPage />
          </div>
        )}

        <ProjectGrid
          projectsState={projectsState}
          projectData={projectData}
          onRetry={() => void projectsQuery.refetch()}
          retrying={projectsQuery.isFetching}
          theme={userData?.theme}
          headingRef={headingRef}
          onNewProject={() => projectEditor.open()}
          onOpenProject={(project) => {
            setSelectedProject(project);
            setIsViewProjectModalOpen(true);
          }}
          onAddTask={(project) => {
            setSelectedProject(project);
            editor.open({ mode: "create", projectId: project.project_id });
          }}
          onEditProject={(project) => projectEditor.open(project.project_id)}
          onDeleteProject={(projectId) => void projectEditor.remove(projectId)}
        />

        {!pageLoading && <SharedProjectsSection toast={toast} />}
        </div>
      </div>

      <ProjectEditorDialog editor={projectEditor} />

      {isViewProjectModalOpen && (
        <ViewProjectModal
          onClose={() => setIsViewProjectModalOpen(false)}
          tasksLoad={{
            state: tasksState,
            onRetry: () => void projectTasksQuery.refetch(),
            retrying: projectTasksQuery.isFetching,
          }}
          project={
            selectedProject ?? {
              id: 0,
              project_id: "",
              title: "",
              description: "",
              color: "",
              colorLabel: "",
              due_date: null,
              createdAt: "",
              updatedAt: "",
              deletedAt: null,
              user_id: "",
            }
          }
          handleCreateTask={() => {
            setIsViewProjectModalOpen(false);
            editor.open({ mode: "create", projectId: selectedProject?.project_id });
          }}
          tasks={tasks ? tasks : []}
          handleUpdateTask={(task) => {
            setIsViewProjectModalOpen(false);
            editor.open({ mode: "update", task });
          }}
          onStatusError={setStatusError}
          handleDeleteTask={(taskId: string) => void deleteTask(taskId)}
          extraActions={selectedProject ? <ProjectChatActions project={selectedProject} toast={toast} /> : null}
        />
      )}

      <TaskEditorDialog editor={editor} projects={projectOptions} preselectedProject={selectedProject} />
    </>
  );
}
