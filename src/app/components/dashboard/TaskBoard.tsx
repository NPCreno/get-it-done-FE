"use client";
import { useCallback, useState, type RefObject } from "react";
import LoadError from "@/app/components/LoadError";
import { TaskItem } from "@/app/components/taskItem";
import type { ITask } from "@/app/interface/ITask";
import type { DashboardData } from "./useDashboardData";

interface TaskBoardProps {
  data: Pick<DashboardData, "tasks" | "upcoming" | "upcomingState">;
  /** Where focus goes when a delete removes the button that opened its dialog. */
  headingRef: RefObject<HTMLHeadingElement | null>;
  onNewTask: () => void;
  onEditTask: (task: ITask) => void;
  /** Asks first (BUG-05). */
  onDeleteTask: (taskId: string, title: string) => void;
  onDeleteRecurring: (taskTemplateId: string, taskId: string) => void;
  notify: (message: string, type: "info" | "success" | "error" | "warning") => void;
}

export default function TaskBoard({
  data,
  headingRef,
  onNewTask,
  onEditTask,
  onDeleteTask,
  onDeleteRecurring,
  notify,
}: TaskBoardProps) {
  const { tasks, upcoming, upcomingState } = data;
  // Only LoadError (not converted in this batch) still takes the mode.
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
    <div className="w-full h-full p-6 flex flex-col rounded-board shadow-sm hover:shadow-md transition-shadow duration-300 fade-in-delay-2 flex-grow border bg-th-card border-th-edge">
      {/* Header - Fixed */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="outline-none text-xl font-card [font-weight:var(--w-card)] [letter-spacing:var(--ls-title)] text-start text-th-ink-hd">
            Recent Tasks
          </h1>
          <p className="text-sm mt-1 text-start text-th-ink-sub">
            Your most recent activities and tasks
          </p>
        </div>
        <button
          // RD-2 primary button: --on-acc on the accent (dark grey on amber in Classic; was white, 1.9:1).
          // Classic keeps its gradient through the --acc-grad-* stops; Calm and Field notes are flat --acc.
          className="relative px-6 py-2.5 flex flex-row gap-2 items-center justify-center rounded-xl h-[44px] font-ui font-medium text-th-on-acc
          shadow-md hover:shadow-lg transform transition-all duration-300 hover:translate-y-[-1px]
          active:translate-y-0 active:scale-95 overflow-hidden group
          bg-gradient-to-r from-th-grad-start to-th-grad-end hover:shadow-th-glow
          before:absolute before:inset-0
          before:bg-gradient-to-r before:from-th-grad-hover-start before:to-th-grad-hover-end
          before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
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
                className="text-th-on-acc"
              />
            </svg>
          </div>

          {/* Button text with subtle tracking */}
          <span className="relative z-10 text-base font-medium tracking-wide">
            New Task
          </span>

          {/* Subtle shine effect on hover */}
          <span className="absolute inset-0 bg-th-shine opacity-0 group-hover:opacity-100 transition-opacity duration-700"></span>
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
            />
          ) : upcomingState.status === "empty" ? (
            <div className="flex flex-col items-center justify-center text-center gap-3">
              <h3 className="text-xl font-semibold mb-1 text-th-ink-hd">Nothing due right now</h3>
              <p className="text-th-ink-dim max-w-md">No tasks are overdue or due in the next 24 hours.</p>
              <button
                type="button"
                className="rounded-xl px-5 py-2 font-ui font-medium text-th-on-acc bg-th-acc hover:opacity-90"
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
              handleDeleteTask={onDeleteTask}
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
              <div className="w-24 h-24 mb-6 text-th-acc">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-th-ink-hd">All caught up!</h3>
              <p className="text-th-ink-dim mb-6 max-w-md">You&apos;ve completed all your tasks. Time to celebrate or add a new challenge!</p>
            </div>
          )}
        </div>

        {/* Completed Tasks Section - Stuck to bottom */}
        <div className="mt-auto">
          {tasks.some(task => task.status === 'Complete') && (
            <div className="mt-4">
              <button
                onClick={() => setShowCompletedTasks((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-th-ink-dim hover:text-th-task transition-colors mb-2"
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
                <div className="space-y-2 pl-4 border-l-2 border-th-rule">
                  {tasks
                    .filter(task => task.status === 'Complete')
                    .map((task) => (
                      <TaskItem
                        key={`completed-${task.task_id}-${task.status}`}
                        task={task}
                        handleUpdateTask={() => onEditTask(task)}
                        handleDeleteTask={onDeleteTask}
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
