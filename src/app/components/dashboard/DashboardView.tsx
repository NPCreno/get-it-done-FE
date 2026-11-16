"use client";
import { useEffect, useRef, useState } from "react";
import { useFormState } from "@/app/context/FormProvider";
import ToastHost from "@/app/components/ToastHost";
import LoadingPage from "@/app/components/loader";
import PomodoroModal from "@/app/components/modals/pomodoro";
import ConfirmationModal from "@/app/components/modals/confirmation";
import TaskEditorDialog from "@/app/components/tasks/TaskEditorDialog";
import { useTaskEditor } from "@/app/components/tasks/useTaskEditor";
import { useTaskDelete } from "@/app/components/tasks/useTaskDelete";
import { useToastController } from "@/hooks/useToastController";
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
  const { deleteTask, requestRecurringDelete, confirmation } = useTaskDelete(toast, editor, headingRef);
  const [showLoader, setShowLoader] = useState(true);
  const [isPomodoroModalOpen, setIsPomodoroModalOpen] = useState(false);

  useEffect(() => {
    if (!data.pageLoading) {
      setTimeout(() => setShowLoader(false), 500); // Match transition duration
    }
  }, [data.pageLoading]);

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
        <div className="inside max-w-[1440px] w-full mx-auto gap-5 flex flex-col">
          {showLoader && (
            <div
              className={`transition-opacity duration-500 ${
                !data.pageLoading ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
            >
              <LoadingPage />
            </div>
          )}

          {!data.pageLoading && (
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
                  onDeleteTask={(taskId) => void deleteTask(taskId)}
                  onDeleteRecurring={requestRecurringDelete}
                  notify={notify}
                />
                <AnalyticsGrid data={data} />
              </div>
            </>
          )}
        </div>
      </div>

      <TaskEditorDialog editor={editor} projects={data.projectOptions} />

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
