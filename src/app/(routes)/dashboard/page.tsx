"use client";
import MainLayout from "@/app/components/MainLayout";
import ChartCard from "../../components/chartCard";
import StatsCard from "../../components/statsCard";
import TaskModal from "@/app/components/modals/taskModal";
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { focusFallback } from '@/lib/focusFallback';
import PomodoroButton from '@/app/components/PomodoroButton';
import DashboardSearch from "@/app/components/DashboardSearch";
import { useFormState } from "@/app/context/FormProvider";
import { FormikErrors, useFormik } from "formik";
import { createTaskSchema } from "@/app/schemas/createTaskSchema";
import {
  useCalendarHeatmap,
  useCompletionTrend,
  useDashboardSummary,
  useProjects,
  useStreak,
  useTaskDistribution,
  useUpcomingTasks,
} from "@/lib/query/queries";
import { useCreateTask, useDeleteRecurringTasks, useDeleteTask, useUpdateTask } from "@/lib/query/mutations";
import { settled } from "@/lib/query/unwrap";
import { loadStateOf } from "@/lib/query/loadState";
import { isEmptyDistribution, isEmptyList, never } from "@/lib/query/emptiness";
import LoadError from "@/app/components/LoadError";
import type { ChartLoad } from "@/app/components/chartCard";
import { IProject } from "@/app/interface/IProject";
import { toCreateTaskRequest, toUpdateTaskRequest } from "@/app/contracts/mappers";
import ToastHost from "@/app/components/ToastHost";
import { useToastController } from "@/hooks/useToastController";
import { ITask } from "@/app/interface/ITask";
import { isUserFacing } from "@/lib/apiClient";
import LoadingPage from "@/app/components/loader";
import { IDashboardData } from "@/app/interface/IDashboardData";
import { ITaskCompletionTrendData } from "@/app/interface/ITaskCompletionTrendData";
import { TaskItem } from "@/app/components/taskItem";
import { ITaskFormErrors } from "@/app/interface/forms/ITaskFormErrors";
import { ITaskFormValues } from "@/app/interface/forms/ITaskFormValues";
import { ITaskDistribution } from "@/app/interface/ITaskDistribution";
import { IHeatmapData } from "@/app/interface/IHeatmapData";
import PomodoroModal from "@/app/components/modals/pomodoro";
import ConfirmationModal from "@/app/components/modals/confirmation";

const NO_PROJECTS: IProject[] = [];
const NO_TASKS: ITask[] = [];
const NO_TREND: ITaskCompletionTrendData[] = [];
const NO_DISTRIBUTION: ITaskDistribution[] = [];
const NO_HEATMAP: IHeatmapData[] = [];
const EMPTY_DASHBOARD: IDashboardData = {
  all_tasks: 0,
  pending_tasks: 0,
  complete_tasks: 0,
  all_projects: 0,
};

export default function DashboardPage() {
  const { 
    selectedTaskData, 
    setSelectedTaskData, 
    selectedMonth, 
    selectedYear, 
    calendarMonthYear, 
    userData
  } = useFormState();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  // One toast controller for the page: the host and every handler below share it.
  const toast = useToastController();
  const [isUpdateTask, setIsUpdateTask] = useState(false);
  // Server data is owned by query hooks (src/lib/query): one key per request
  // parameter set, cancellation, and invalidation from mutations. Nothing here
  // refetches because of a toast, a modal or a user-object change.
  const projectsQuery = useProjects();
  const upcoming = useUpcomingTasks();
  const summary = useDashboardSummary();
  const trend = useCompletionTrend();
  const distribution = useTaskDistribution(selectedMonth, selectedYear);
  const heatmap = useCalendarHeatmap(calendarMonthYear.month, calendarMonthYear.year);
  const streak = useStreak();
  const projectOptions = projectsQuery.data ?? NO_PROJECTS; // options only: errors here are not shown as empty UI
  // One policy decides what every widget shows (never `data ?? EMPTY`).
  const upcomingState = loadStateOf(upcoming, isEmptyList);
  const summaryState = loadStateOf(summary, never);
  const trendState = loadStateOf(trend, isEmptyList);
  const distributionState = loadStateOf(distribution, isEmptyDistribution);
  const heatmapState = loadStateOf(heatmap, never);
  const streakState = loadStateOf(streak, never);
  const tasks = upcoming.data ?? NO_TASKS;
  const dashboardData = summary.data ?? EMPTY_DASHBOARD;
  const taskCompletionData = trend.data ?? NO_TREND;
  const taskDistributionData = distribution.data ?? NO_DISTRIBUTION;
  const calendarHeatmapData = heatmap.data ?? NO_HEATMAP;
  const streakCount = streak.data?.count ?? 0;
  const loadOf = (state: ChartLoad["state"], q: { refetch: () => unknown; isFetching: boolean }): ChartLoad => ({
    state,
    onRetry: () => void q.refetch(),
    retrying: q.isFetching,
  });
  // First load only. On error the page never waits: the shell renders with the error widgets.
  const pageLoading = upcomingState.status === "loading" || summaryState.status === "loading";
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const deleteRecurringMutation = useDeleteRecurringTasks();
  // Where focus goes if the delete removes the button that opened the dialog.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [isPomodoroModalOpen, setIsPomodoroModalOpen] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [taskTemplateIdToDelete, setTaskTemplateIdToDelete] = useState<string>("");
  const [taskIdToDelete, setTaskIdToDelete] = useState<string>("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());

  const handleToggleSubtasks = useCallback((taskId: string) => {
    setExpandedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const initialValues = useMemo(
    () => ({
      title: "",
      description: "",
      due_date: null,
      project_id: "",
      project_title: "",
      project_color: "",
      priority: "Low",
      status: "Pending",
      isRecurring: false,
      repeat_every: "",
      repeat_days: [],
      start_date: null,
      end_date: null,
      project: "",
    }),
    []
  );

  const {
    validateForm,
    setFieldValue,
    setFieldError,
    values,
    errors,
    handleSubmit,
    handleChange,
    setSubmitting,
    resetForm,
  } = useFormik({
    initialValues,
    enableReinitialize: true,
    validationSchema: createTaskSchema,
    validateOnChange: false, // Disable real-time validation
    validateOnBlur: false,
    onSubmit: async (values) => {
      if (!userData) return;
      handleSubmitForm(values);
    },
  });

  const handleSubmitForm = async (values: ITaskFormValues) => {
    const validationErrors: FormikErrors<typeof values> = await validateForm();
    console.log("validationErrors: ", validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      await createTask(values);
    }
    setSubmitting(false);
  };

  const createTask = async (values: ITaskFormValues) => {
    try {
      setIsLoading(true);
      if (!userData) {
        console.error("No User data found");
        return;
      }
      const payload = toCreateTaskRequest(values);
      const response = await settled(createTaskMutation.mutateAsync(payload));
      if (response.ok) {
        setIsTaskModalOpen(false);
        toast.success("Task Created", "Your new task has been created successfully", response.data.message);
      } else if (isUserFacing(response.failure)) {
        // The modal stays open so the user can retry.
        toast.failure(response.failure);
      }
    } catch (error) {
      toast.unexpected(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isTaskModalOpen && !isUpdateTask) {
      resetForm({
        values: {
          ...initialValues,
          status: "Pending",
        },
      });
    }
  }, [isTaskModalOpen, isUpdateTask, initialValues, resetForm]);

  const handleUpdateTask = async (values: ITaskFormValues) => {
    const validationErrors: FormikErrors<typeof values> = await validateForm();
    if (Object.keys(validationErrors).length === 0) {
      await updateTask(values);
    }
    setSubmitting(false);
  };

  const updateTask = async (values: ITaskFormValues) => {
    try {
      setIsLoading(true);
      if (!userData) {
        console.error("No User data found");
        return;
      }
      const taskId = selectedTaskData ? selectedTaskData.task_id : values.task_id;
      if (!taskId) {
        console.error("No task id to update");
        return;
      }
      const response = await settled(updateTaskMutation.mutateAsync({ taskId, body: toUpdateTaskRequest(values) }));
      if (response.ok) {
        clearValueAndErrors();
        setIsTaskModalOpen(false);
        toast.success("Task Updated", "Your task has been updated successfully", response.data.message);
      } else if (isUserFacing(response.failure)) {
        // Backend rejected it (kind 'api'): reset and close. Transport failure: keep the modal open.
        if (response.failure.kind === 'api') {
          clearValueAndErrors();
          setIsTaskModalOpen(false);
        }
        toast.failure(response.failure);
      }
    } catch (error) {
      toast.unexpected(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setFieldValue("title", selectedTaskData?.title || "");
    setFieldValue("description", selectedTaskData?.description || "");
    setFieldValue("priority", selectedTaskData?.priority || "");
    setFieldValue("status", selectedTaskData?.status || "");
    setFieldValue("due_date", selectedTaskData?.due_date || null);
    setFieldValue("isRecurring", false);
  }, [selectedTaskData, setFieldValue]);

  const clearValueAndErrors = () => {
    setFieldValue("title", "");
    setFieldValue("description", "");
    setFieldValue("priority", "");
    setFieldValue("project", "");
    setFieldValue("status", "");
    setFieldValue("due_date", null);
    setFieldValue("isRecurring", false);
    setFieldValue("repeat_every", "");
    setFieldValue("repeat_days", []);
    setFieldValue("start_date", null);
    setFieldValue("end_date", null);
    setFieldError("title", "");
    setFieldError("description", "");
    setFieldError("priority", "");
    setFieldError("project", "");
    setFieldError("status", "");
    setFieldError("due_date", "");
  };

  useEffect(() => {
    if (!pageLoading) {
      setTimeout(() => setShowLoader(false), 500); // Match transition duration
    }
  }, [pageLoading]);

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
  };

  const handleDeleteRecurringTasks = (taskTemplate_id: string, taskId: string) => {
    setTaskTemplateIdToDelete(taskTemplate_id);
    setTaskIdToDelete(taskId);
    setShowConfirmation(true);
  };
   
  const handleConfirmDeleteRecurringTasks = async () => {
    // after confirming to delete
    if (taskTemplateIdToDelete) {
      try {
        const result = await settled(deleteRecurringMutation.mutateAsync(taskTemplateIdToDelete));
        if (!result.ok) throw new Error(result.failure.message);
        focusFallback(headingRef);
        toast.success("Success", "Recurring tasks deleted successfully");
      } catch (error) {
        console.error('Failed to delete recurring tasks:', error);
        toast.error("Error", "Failed to delete recurring tasks");
      }
      setShowConfirmation(false);
      setTaskTemplateIdToDelete("");
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const response = await settled(deleteTaskMutation.mutateAsync(taskId));
      if (response.ok) {
        clearValueAndErrors();
        setIsTaskModalOpen(false);
        focusFallback(headingRef);
        toast.success("Task Deleted", "Your task has been deleted successfully", response.data.message);
      } else if (isUserFacing(response.failure)) {
        if (response.failure.kind === 'api') {
          clearValueAndErrors();
          setIsTaskModalOpen(false);
        }
        toast.failure(response.failure);
      }
    } catch (error) {
      toast.unexpected(error);
    }
  };

  // Toast only. Counts and task lists come from the refetch, never from the message text.
  const notify = (message: string, type: 'info' | 'success' | 'error' | 'warning') => {
    toast.show(
      {
        title: type === 'error' ? 'Something Went Wrong' : 'Task update',
        description: message,
        className: type === 'success'
          ? 'text-success-default'
          : type === 'error'
            ? 'text-error-default'
            : type === 'warning'
              ? 'text-warning-default'
              : 'text-accent-default',
      },
      { displayMs: 3000 }
    );
  };

  return (
    <MainLayout>
      <ToastHost controller={toast} />
      <div className="main flex justify-center w-full h-full">
        {/* Main Page */}
        <div className="inside max-w-[1440px] w-full mx-auto gap-5 flex flex-col">
          {showLoader && (
            <div
              className={`transition-opacity duration-500 ${
                !pageLoading ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
            >
              <LoadingPage />
            </div>
          )}

          {!pageLoading && (
            <>
              {/* Header */}
              <div className="relative flex flex-col md:flex-row justify-between gap-4 mb-2">
                {/* Left header */}
                <div className="relative z-10 flex flex-col group">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-gradient-to-b from-primary-default to-primary-200 rounded-full transform transition-transform duration-300 group-hover:scale-y-110"></div>
                    <div className="space-y-0.5">
                    <h1 className={`text-2xl md:text-3xl font-bold fade-in select-none bg-clip-text text-transparent ${
                          userData  ?.theme === "dark" 
                            ? "bg-gradient-to-r from-blue-300 via-amber-200 to-blue-300" 
                            : "bg-gradient-to-r from-gray-800 to-gray-600"
                    }`}>
                        Dashboard
                      </h1>
                      <p className="font-lato text-sm text-gray-500 fade-in-delay-1 select-none transition-all duration-300 group-hover:text-gray-600">
                        Track your tasks and monitor your progress
                      </p>
                    </div>
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute -left-2 -top-2 w-24 h-24 bg-primary-50 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
                {/* Right header */}
                <div className="flex flex-col lg:flex-row gap-[10px] md:items-end items-start">
                  <DashboardSearch theme={userData?.theme} />

                  <PomodoroButton 
                    onOpenChange={setIsPomodoroModalOpen}
                  />
                    
                </div>
              </div>

              {summaryState.status === "error" && (
                <LoadError
                  widget="task summary"
                  failure={summaryState.failure}
                  onRetry={() => void summary.refetch()}
                  retrying={summary.isFetching}
                  theme={userData?.theme}
                />
              )}
              {summaryState.status === "ready" && summaryState.refreshFailure && (
                <LoadError
                  widget="task summary"
                  failure={summaryState.refreshFailure}
                  onRetry={() => void summary.refetch()}
                  retrying={summary.isFetching}
                  theme={userData?.theme}
                  variant="compact"
                />
              )}

              {/* first row cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 w-full fade-in-delay-2 group/cards">
                <div className="transform transition-all duration-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-100/30">
                  <StatsCard
                    icon="/svgs/list-outline.svg"
                    header="All Tasks"
                    content={summaryState.status === "error" ? "—" : String(dashboardData.all_tasks)}
                    delay="fade-in-left-delay-1"
                    className="h-full hover:bg-gradient-to-br from-white to-gray-50 transition-all duration-300"
                    theme={userData?.theme}
                  />
                </div>
                <div className="transform transition-all duration-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-100/30">
                  <StatsCard
                    icon="/svgs/timer-outline.svg"
                    header="To Do"
                    content={summaryState.status === "error" ? "—" : String(dashboardData.pending_tasks)}
                    delay="fade-in-left-delay-2"
                    className="h-full hover:bg-gradient-to-br from-white to-amber-50/30 transition-all duration-300"
                    theme={userData?.theme}
                  />
                </div>
                <div className="transform transition-all duration-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-100/30">
                  <StatsCard
                    icon="/svgs/folder-open-outline.svg"
                    header="All Projects"
                    content={summaryState.status === "error" ? "—" : String(dashboardData.all_projects)}
                    delay="fade-in-left-delay-3"
                    className="h-full hover:bg-gradient-to-br from-white to-blue-50/30 transition-all duration-300"
                    theme={userData?.theme}
                  />
                </div>
                <div className="transform transition-all duration-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-green-100/30">
                  <StatsCard
                    icon="/svgs/checkbox-outline.svg"
                    header="Complete"
                    content={summaryState.status === "error" ? "—" : String(dashboardData.complete_tasks)}
                    delay="fade-in-left-delay-4"
                    className="h-full hover:bg-gradient-to-br from-white to-green-50/30 transition-all duration-300"
                    theme={userData?.theme}
                  />
                </div>
              </div> 

              <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5 items-center justify-center text-center">
                {/* Task board */}
                <div className={`w-full h-full p-6 flex flex-col rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 fade-in-delay-2 flex-grow border
                  ${userData?.theme === "dark" ? "bg-foreground-dark" : "bg-white"}
                  ${userData?.theme === "dark" ? "border-gray-800" : ""}
                   `}>
                  {/* Header - Fixed */}
                  <div className={`flex flex-col sm:flex-row justify-between gap-4 
                  ${userData?.theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}
                  `}>
                    <div>
                      <h1 ref={headingRef} tabIndex={-1} className={`outline-none text-xl font-lato font-bold text-start ${
                        userData?.theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        Recent Tasks
                      </h1>
                      <p className={`text-sm mt-1 text-start ${
                        userData?.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Your most recent activities and tasks
                      </p>
                    </div>
                    <button
                      className={`relative px-6 py-2.5 flex flex-row gap-2 items-center justify-center rounded-xl h-[44px] font-lato font-medium text-white 
                      shadow-md hover:shadow-lg transform transition-all duration-300 hover:translate-y-[-1px] 
                      active:translate-y-0 active:scale-95 overflow-hidden group
                      ${userData?.theme === 'dark' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:shadow-amber-500/20' : 'bg-gradient-to-r from-primary-default to-primary-200 hover:shadow-primary-default/20'}
                      before:absolute before:inset-0 
                      ${
                        userData?.theme === 'dark'
                          ? 'before:bg-gradient-to-r before:from-amber-600 before:to-yellow-400'
                          : 'before:bg-gradient-to-r before:from-primary-200 before:to-primary-default'
                      }
                      before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300`}
                      onClick={() => {
                        setIsTaskModalOpen(true);
                        clearValueAndErrors();
                        setIsUpdateTask(false);
                      }}
                    >
                      {/* Animated ring effect */}
                      <span className="absolute inset-0 rounded-xl overflow-hidden">
                        <span className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                      </span>

                      {/* Plus icon with subtle animation */}
                      <div className="relative z-10 flex items-center justify-center">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 25 25"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="transition-transform duration-300 group-hover:rotate-90"
                        >
                          <path
                            d="M18.7501 12.499H5.25012M12.0001 5.74902V19.249"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-white"
                          />
                        </svg>
                      </div>

                      {/* Button text with subtle tracking */}
                      <span className="relative z-10 text-base font-medium tracking-wide">
                        New Task
                      </span>

                      {/* Subtle shine effect on hover */}
                      <span className={`absolute inset-0 ${
                        userData?.theme === 'dark' ? 'bg-amber-400/5' : 'bg-white/5'
                      } opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></span>
                    </button>
                  </div>

                  {/* Scrollable Task List */}
                  <div className="flex flex-col h-full">
                    {/* Active Tasks - Centered */}
                    <div className={`flex-grow flex flex-col ${tasks.filter(task => task.status !== 'Complete').length > 0 ? 'justify-start mt-5' : 'justify-center'}`}>
                      {upcomingState.status === "ready" && upcomingState.refreshFailure && (
                        <div className="mb-3">
                          <LoadError
                            widget="your tasks"
                            failure={upcomingState.refreshFailure}
                            onRetry={() => void upcoming.refetch()}
                            retrying={upcoming.isFetching}
                            theme={userData?.theme}
                            variant="compact"
                          />
                        </div>
                      )}
                      {upcomingState.status === "error" ? (
                        <LoadError
                          widget="your tasks"
                          failure={upcomingState.failure}
                          onRetry={() => void upcoming.refetch()}
                          retrying={upcoming.isFetching}
                          theme={userData?.theme}
                        />
                      ) : upcomingState.status === "empty" ? (
                        <div className="flex flex-col items-center justify-center text-center gap-3">
                          <h3 className={`text-xl font-semibold mb-1 ${userData?.theme === "dark" ? "text-white" : "text-gray-800"}`}>Nothing due right now</h3>
                          <p className="text-gray-500 max-w-md">No tasks are overdue or due in the next 24 hours.</p>
                          <button
                            type="button"
                            className="rounded-xl px-5 py-2 font-lato font-medium text-white bg-primary-default hover:opacity-90"
                            onClick={() => {
                              setIsTaskModalOpen(true);
                              clearValueAndErrors();
                              setIsUpdateTask(false);
                            }}
                          >
                            New Task
                          </button>
                        </div>
                      ) : tasks.filter(task => task.status !== 'Complete').length > 0 ? (
                      tasks
                        .filter(task => task.status !== 'Complete')
                        .map((task) => (
                        <TaskItem
                          key={`active-${task.task_id}-${task.status}`}
                          task={task}
                          handleUpdateTask={() => {
                            setSelectedTaskData(task);
                            setIsTaskModalOpen(true);
                            setIsUpdateTask(true);
                          }}
                          handleDeleteTask={(taskId: string) => handleDeleteTask(taskId)}
                          handleDeleteRecurringTasks={
                            (taskTemplate_id: string, taskId: string) => 
                            handleDeleteRecurringTasks(taskTemplate_id, taskId)
                          }
                          showSubtasks={expandedTaskIds.has(task.task_id)}
                          onToggleSubtasks={handleToggleSubtasks}
                          notify={notify}
                          subTasks={task.subInstances}
                        />
                      )))
                      : (
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-24 h-24 mb-6 text-primary-default">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h3 className={`text-xl font-semibold text-gray-800 mb-2 ${userData?.theme === "dark" ? "text-white" : "text-gray-800"}`}>All caught up!</h3>
                          <p className="text-gray-500 mb-6 max-w-md">You&apos;ve completed all your tasks. Time to celebrate or add a new challenge!</p>
                        </div>
                      )}
                    </div>

                    {/* Completed Tasks Section - Stuck to bottom */}
                    <div className="mt-auto">
                      {tasks.some(task => task.status === 'Complete') && (
                        <div className="mt-4">
                          <button
                            onClick={() => setShowCompletedTasks((v) => !v)}
                            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-2"
                          >
                            <span>Completed ({tasks.filter(task => task.status === 'Complete').length})</span>
                            <svg
                              className={`w-4 h-4 transition-transform duration-200 ${showCompletedTasks ? 'rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {showCompletedTasks && (
                            <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                              {tasks
                                .filter(task => task.status === 'Complete')
                                .map((task) => (
                                  <TaskItem
                                    key={`completed-${task.task_id}-${task.status}`}
                                    task={task}
                                    handleUpdateTask={() => {
                                      setSelectedTaskData(task);
                                      setIsTaskModalOpen(true);
                                      setIsUpdateTask(true);
                                    }}
                                    handleDeleteTask={() => handleDeleteTask(task.task_id)}
                                    handleDeleteRecurringTasks={(taskTemplate_id: string, taskId: string) => 
                                      handleDeleteRecurringTasks(taskTemplate_id, taskId)
                                    }
                                    showSubtasks={expandedTaskIds.has(task.task_id)}
                                    onToggleSubtasks={handleToggleSubtasks}
                                    notify={notify}
                                    subTasks={task.subInstances}
                                  />
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chart cards */}
                <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-5 w-full fade-in-delay-2">
                  <div className="transform transition-all duration-500 hover:scale-[1.01] hover:shadow-lg hover:shadow-primary-100/20">
                    <ChartCard
                      header="Task Completion Trend"
                      delay="fade-in-left-delay-1"
                      taskCompletionData={taskCompletionData}
                      load={loadOf(trendState, trend)}
                    />
                  </div>
                  <div className="transform transition-all duration-500 hover:scale-[1.01] hover:shadow-lg hover:shadow-amber-100/20">
                    <ChartCard
                      header="Task Distribution by project"
                      delay="fade-in-left-delay-2"
                      taskDistributionData={taskDistributionData}
                      load={loadOf(distributionState, distribution)}
                    />
                  </div>
                  <div className="transform transition-all duration-500 hover:scale-[1.01] hover:shadow-lg hover:shadow-blue-100/20">
                    <ChartCard
                      header="Productivity Streak"
                      delay="fade-in-left-delay-3"
                      streakCount={streakCount}
                      load={loadOf(streakState, streak)}
                    />
                  </div>
                  <div className="transform transition-all duration-500 hover:scale-[1.01] hover:shadow-lg hover:shadow-green-100/20">
                    <ChartCard
                      header="Calendar Heat map"
                      delay="fade-in-left-delay-4"
                      calendarHeatmapData={calendarHeatmapData}
                      load={loadOf(heatmapState, heatmap)}
                    />
                  </div>
                </div>
              </div>
              
            </>
          )}

        </div>
      </div>

      {isTaskModalOpen && (
        <TaskModal
          onClose={() => setIsTaskModalOpen(false)}
          formik={{
            values: values,
            errors: errors as ITaskFormErrors,
            handleChange,
            setFieldValue,
            setFieldError,
          }}
          handleCreateTask={() => handleSubmit()}
          project={projectOptions}
          isUpdate={isUpdateTask}
          handleUpdateTask={() => handleUpdateTask(values as ITaskFormValues)}
          isLoading={isLoading}
        />
      )}

      {isPomodoroModalOpen && (
        <PomodoroModal onClose={() => setIsPomodoroModalOpen(false)} />
      )}

      {showConfirmation && (
        <ConfirmationModal
          onClose={() => setShowConfirmation(false)}
          title="Delete Recurring Tasks"
          description="How would you like to delete these tasks?"
          actions={[
            {
              label: 'Delete This Task Only',
              onClick: () => {
                handleDeleteTask(taskIdToDelete);
                setShowConfirmation(false);
              },
              variant: 'primary'
            },
            {
              label: 'Delete All Recurring Tasks',
              onClick: async () => {
                handleConfirmDeleteRecurringTasks();
                setShowConfirmation(false);
              },
              variant: 'danger'
            },
            {
              label: 'Cancel',
              onClick: () => setShowConfirmation(false),
            }
          ]}
        />
      )}
    </MainLayout>
  );
}
