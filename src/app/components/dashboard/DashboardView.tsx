"use client";
import { useRef, useState } from "react";
import { useFormState } from "@/app/context/FormProvider";
import ToastHost from "@/app/components/ToastHost";
import LoadingPage from "@/app/components/loader";
import { PAGE_IN_CLASS } from "@/app/components/loaderClasses";
import PomodoroModal from "@/app/components/modals/pomodoro";
import ConfirmationModal from "@/app/components/modals/confirmation";
import TaskEditorDialog from "@/app/components/tasks/TaskEditorDialog";
import { useTaskEditor } from "@/app/components/tasks/useTaskEditor";
import { useTaskDelete } from "@/app/components/tasks/useTaskDelete";
import TaskDeleteConfirm from "@/app/components/tasks/TaskDeleteConfirm";
import { useToastController } from "@/hooks/useToastController";
import { useFirstLoad, usePageIn, usePresence } from "@/hooks/usePresence";
import AnalyticsGrid from "./AnalyticsGrid";
import DashboardHeader from "./DashboardHeader";
import StatsRow from "./StatsRow";
import TaskBoard from "./TaskBoard";
import { useDashboardData } from "./useDashboardData";

/**
 * The dashboard body, without a layout. `/dashboard` wraps it in `MainLayout`; `/demo` renders it
 * inside its own shell. It must stay free of layout-only hooks (profile, notifications, token
 * reads): the lint override in `.eslintrc.json` enforces that for this folder.
 */
export default function DashboardView() {
  const { userData } = useFormState();
  const theme = userData?.theme;

  // One toast controller for the page: the host and every handler below share it.
  const toast = useToastController();
  // The one task editor (create and update); the editor is the only writer of selectedTaskData.
  const editor = useTaskEditor(toast);
  const data = useDashboardData();
  // Where focus goes if a delete removes the button that opened the dialog.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const taskDelete = useTaskDelete(toast, editor, headingRef);
  const { requestDelete, requestRecurringDelete, confirmation } = taskDelete;
  const [isPomodoroModalOpen, setIsPomodoroModalOpen] = useState(false);
  // UX-04: the loader is for the first load only; it plays its exit while the page rises in.
  const firstLoad = useFirstLoad(data.pageLoading);
  const loader = usePresence(firstLoad);
  const pageIn = usePageIn(loader.leaving);

  // Toast only. Counts and task lists come from the refetch, never from the message text.
  const notify = (message: string, type: "info" | "success" | "error" | "warning") => {
    toast.show(
      {
        title: type === "error" ? "Something Went Wrong" : "Task update",
        description: message,
        className: type === "success"
          ? "text-success-default"
          : type === "error"
            ? "text-error-default"
            : type === "warning"
              ? "text-warning-default"
              : "text-accent-default",
      },
      { displayMs: 3000 }
    );
  };

  return (
    <>
      <ToastHost controller={toast} />
      <div className="main flex justify-center w-full h-full">
        {/* Main Page */}
        <div
          className={`inside max-w-[1440px] w-full mx-auto gap-5 flex flex-col ${pageIn.active ? PAGE_IN_CLASS : ""}`}
          onAnimationEnd={pageIn.onAnimationEnd}
        >
          {/* Once the first-load loader is gone the body stays: a refetch of a query in error with no
              data is "loading" again (TanStack v5), e.g. the UX-03 refetch on wake, and the widgets
              show their own loading state instead of the whole page going blank. */}
          {!firstLoad && (
            <>
              <DashboardHeader theme={theme} onPomodoroOpenChange={setIsPomodoroModalOpen} />
              <StatsRow data={data} theme={theme} />
              <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5 items-center justify-center text-center">
                <TaskBoard
                  data={data}
                  theme={theme}
                  headingRef={headingRef}
                  onNewTask={() => editor.open({ mode: "create" })}
                  onEditTask={(task) => editor.open({ mode: "update", task })}
                  onDeleteTask={requestDelete}
                  onDeleteRecurring={requestRecurringDelete}
                  notify={notify}
                />
                <AnalyticsGrid data={data} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* After the page in the DOM, so it paints over it; outside the root, whose page-in transform
          would otherwise become the overlay's containing block. */}
      {loader.mounted && <LoadingPage dark={theme === "dark"} leaving={loader.leaving} />}

      <TaskEditorDialog editor={editor} projects={data.projectOptions} />

      <TaskDeleteConfirm flow={taskDelete} />

      {isPomodoroModalOpen && (
        <PomodoroModal onClose={() => setIsPomodoroModalOpen(false)} />
      )}

      {confirmation.open && (
        <ConfirmationModal
          onClose={confirmation.close}
          title="Delete Recurring Tasks"
          description="How would you like to delete these tasks?"
          actions={[
            { label: "Delete This Task Only", onClick: confirmation.deleteThisOnly, variant: "primary" },
            { label: "Delete All Recurring Tasks", onClick: confirmation.deleteAll, variant: "danger" },
            { label: "Cancel", onClick: confirmation.close },
          ]}
        />
      )}
    </>
  );
}
