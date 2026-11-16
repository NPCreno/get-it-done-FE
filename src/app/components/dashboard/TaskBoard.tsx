"use client";
import { useCallback, useState, type RefObject } from "react";
import LoadError from "@/app/components/LoadError";
import { TaskItem } from "@/app/components/taskItem";
import type { ITask } from "@/app/interface/ITask";
import type { DashboardData } from "./useDashboardData";

interface TaskBoardProps {
  data: Pick<DashboardData, "tasks" | "upcoming" | "upcomingState">;
  theme?: string;
  /** Where focus goes when a delete removes the button that opened its dialog. */
  headingRef: RefObject<HTMLHeadingElement | null>;
  onNewTask: () => void;
  onEditTask: (task: ITask) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteRecurring: (taskTemplateId: string, taskId: string) => void;
  notify: (message: string, type: "info" | "success" | "error" | "warning") => void;
}

export default function TaskBoard({
  data,
  theme,
  headingRef,
  onNewTask,
  onEditTask,
  onDeleteTask,
  onDeleteRecurring,
  notify,
}: TaskBoardProps) {
  const { tasks, upcoming, upcomingState } = data;
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
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

  return (
    <div className={`w-full h-full p-6 flex flex-col rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 fade-in-delay-2 flex-grow border
      ${theme === "dark" ? "bg-foreground-dark" : "bg-white"}
      ${theme === "dark" ? "border-gray-800" : ""}
       `}>
      {/* Header - Fixed */}
      <div className={`flex flex-col sm:flex-row justify-between gap-4
      ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}
      `}>
        <div>
          <h1 ref={headingRef} tabIndex={-1} className={`outline-none text-xl font-lato font-bold text-start ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>
            Recent Tasks
          </h1>
          <p className={`text-sm mt-1 text-start ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Your most recent activities and tasks
          </p>
        </div>
        <button
          className={`relative px-6 py-2.5 flex flex-row gap-2 items-center justify-center rounded-xl h-[44px] font-lato font-medium text-white
          shadow-md hover:shadow-lg transform transition-all duration-300 hover:translate-y-[-1px]
          active:translate-y-0 active:scale-95 overflow-hidden group
          ${theme === 'dark' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:shadow-amber-500/20' : 'bg-gradient-to-r from-primary-default to-primary-200 hover:shadow-primary-default/20'}
          before:absolute before:inset-0
          ${
            theme === 'dark'
              ? 'before:bg-gradient-to-r before:from-amber-600 before:to-yellow-400'
              : 'before:bg-gradient-to-r before:from-primary-200 before:to-primary-default'
          }
          before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300`}
          onClick={onNewTask}
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
            theme === 'dark' ? 'bg-amber-400/5' : 'bg-white/5'
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
                theme={theme}
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
              theme={theme}
            />
          ) : upcomingState.status === "empty" ? (
            <div className="flex flex-col items-center justify-center text-center gap-3">
              <h3 className={`text-xl font-semibold mb-1 ${theme === "dark" ? "text-white" : "text-gray-800"}`}>Nothing due right now</h3>
              <p className="text-gray-500 max-w-md">No tasks are overdue or due in the next 24 hours.</p>
              <button
                type="button"
                className="rounded-xl px-5 py-2 font-lato font-medium text-white bg-primary-default hover:opacity-90"
                onClick={onNewTask}
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
              handleUpdateTask={() => onEditTask(task)}
              handleDeleteTask={(taskId: string) => onDeleteTask(taskId)}
              handleDeleteRecurringTasks={
                (taskTemplate_id: string, taskId: string) =>
                onDeleteRecurring(taskTemplate_id, taskId)
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
              <h3 className={`text-xl font-semibold text-gray-800 mb-2 ${theme === "dark" ? "text-white" : "text-gray-800"}`}>All caught up!</h3>
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
                        handleUpdateTask={() => onEditTask(task)}
                        handleDeleteTask={() => onDeleteTask(task.task_id)}
                        handleDeleteRecurringTasks={(taskTemplate_id: string, taskId: string) =>
                          onDeleteRecurring(taskTemplate_id, taskId)
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
  );
}
