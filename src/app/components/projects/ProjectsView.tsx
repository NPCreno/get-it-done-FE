"use client";
import { useEffect, useRef, useState } from "react";
import { useFormState } from "@/app/context/FormProvider";
import ToastHost from "@/app/components/ToastHost";
import LoadingPage from "@/app/components/loader";
import { PAGE_IN_CLASS } from "@/app/components/loaderClasses";
import ViewProjectModal from "@/app/components/modals/viewProject";
import ProjectChatActions from "@/app/components/chat/ProjectChatActions";
import SharedProjectsSection from "@/app/components/chat/SharedProjectsSection";
import TaskEditorDialog from "@/app/components/tasks/TaskEditorDialog";
import { useTaskEditor } from "@/app/components/tasks/useTaskEditor";
import { useTaskDelete } from "@/app/components/tasks/useTaskDelete";
import TaskDeleteConfirm from "@/app/components/tasks/TaskDeleteConfirm";
import type { IProject } from "@/app/interface/IProject";
import type { ITask } from "@/app/interface/ITask";
import { useToastController } from "@/hooks/useToastController";
import { useFirstLoad, usePageIn, usePresence } from "@/hooks/usePresence";
import { useProjects, useProjectTasks } from "@/lib/query/queries";
import { loadStateOf } from "@/lib/query/loadState";
import { isEmptyList } from "@/lib/query/emptiness";
import ProjectEditorDialog from "./ProjectEditorDialog";
import ProjectGrid from "./ProjectGrid";
import { useProjectEditor } from "./useProjectEditor";
import { sharedAsProject } from "./sharedProject";

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
  const taskDelete = useTaskDelete(toast, editor, headingRef);
  const [isViewProjectModalOpen, setIsViewProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<IProject | null>(null);
  // FEAT-09: the open project is someone else's (opened from "Shared with me").
  const [selectedIsShared, setSelectedIsShared] = useState(false);
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
  // UX-04: the loader is for the first load only; it plays its exit while the page rises in.
  const firstLoad = useFirstLoad(pageLoading);
  const loader = usePresence(firstLoad);
  const pageIn = usePageIn(loader.leaving);

  useEffect(() => {
    if (!editor.isOpen && !isViewProjectModalOpen) {
      setSelectedProject(null);
      setSelectedIsShared(false);
    }
  }, [isViewProjectModalOpen, editor.isOpen]);

  return (
    <>
      <ToastHost controller={toast} />
      <div className="main flex justify-center h-full w-full">
        {/* Main Page */}
        <div
          className={`inside flex flex-col gap-5 max-w-[1440px] w-full mx-auto ${pageIn.active ? PAGE_IN_CLASS : ""}`}
          onAnimationEnd={pageIn.onAnimationEnd}
        >
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
            setSelectedIsShared(false);
            setIsViewProjectModalOpen(true);
          }}
          onAddTask={(project) => {
            setSelectedProject(project);
            setSelectedIsShared(false);
            editor.open({ mode: "create", projectId: project.project_id });
          }}
          onEditProject={(project) => projectEditor.open(project.project_id)}
          onDeleteProject={(projectId) => void projectEditor.remove(projectId)}
        />

        {!pageLoading && (
          <SharedProjectsSection
            toast={toast}
            onViewProject={(shared) => {
              setSelectedProject(sharedAsProject(shared));
              setSelectedIsShared(true);
              setIsViewProjectModalOpen(true);
            }}
          />
        )}
        </div>
      </div>

      {/* After the page, outside its root (see DashboardView). */}
      {loader.mounted && <LoadingPage dark={userData?.theme === "dark"} leaving={loader.leaving} />}

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
          handleDeleteTask={taskDelete.requestDelete}
          canManageProject={!selectedIsShared}
          extraActions={selectedProject && !selectedIsShared ? <ProjectChatActions project={selectedProject} toast={toast} /> : null}
        />
      )}

      <TaskEditorDialog editor={editor} projects={projectOptions} preselectedProject={selectedProject} />

      <TaskDeleteConfirm flow={taskDelete} />
    </>
  );
}
