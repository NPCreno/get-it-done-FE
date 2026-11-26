import React, { useState } from 'react';
import { IProject } from '@/app/interface/IProject';
import { ITask } from '@/app/interface/ITask';
import { useSetTaskStatus } from '@/lib/query/mutations';
import { failureOf } from '@/lib/query/unwrap';
import { isUserFacing } from '@/lib/apiClient';
import LoadError from '../LoadError';
import type { LoadState } from '@/lib/query/loadState';
import Image from 'next/image';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/app/components/shadcn/dialog';
import AssigneeChip from '@/app/components/tasks/AssigneeChip';
import { canDeleteTask } from '@/app/components/tasks/assignee';
import { useAppearance } from "@/hooks/useAppearance";
interface ViewProjectModalProps {
  onClose: () => void;
  project: IProject;
  handleCreateTask: () => void;
  tasks: ITask[];
  tasksLoad: { state: LoadState<unknown>; onRetry: () => void; retrying: boolean };
  handleUpdateTask: (task: ITask) => void;
  onStatusError: (message: string) => void;
  /** Asks first (BUG-05): `useTaskDelete().requestDelete`. */
  handleDeleteTask: (taskId: string, title: string) => void;
  /** Extra footer actions (the owner's chat buttons). */
  extraActions?: React.ReactNode;
  /**
   * FEAT-09: false for a project someone shared with me. Owner-only actions (the members and
   * project buttons in `extraActions`) are not shown; tasks can still be added, edited and toggled.
   */
  canManageProject?: boolean;
}

export default function ViewProjectModal({ 
  onClose, 
  project, 
  handleCreateTask,
  tasks,
  tasksLoad,
  handleUpdateTask,
  onStatusError,
  handleDeleteTask,
  extraActions,
  canManageProject = true,
}: ViewProjectModalProps) {
 
  const { isDark } = useAppearance();

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        overlayClassName={`fixed inset-0 ${isDark ? 'bg-black/60' : 'bg-black/40'} flex justify-center items-center z-50`}
        className={`modal-popup ${isDark ? 'bg-foreground-dark' : 'bg-white'} w-[550px] h-auto rounded-[10px] p-5 shadow-lg flex flex-col gap-5`}
      >
        <div className="flex flex-col">
          <div className="flex flex-row justify-between items-center">
            <DialogTitle className={`${isDark ? 'text-white' : 'text-text'} text-[20px] font-bold font-lato`}>{project.title}</DialogTitle>
            <DialogClose asChild>
            <button type="button" className="cursor-pointer" aria-label="Close">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.5 4.50098L4.5 11.501M11.5 11.501L4.5 4.50098L11.5 11.501Z" stroke={isDark ? '#9ca3af' : '#666666'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            </DialogClose>
          </div>
          <DialogDescription className={`${isDark ? 'text-gray-300' : 'text-[#676767]'} text-sm font-lato`}>
            {project.description ? project.description : "View and manage tasks in this project"}
          </DialogDescription>
        </div>

        <div className="flex flex-col gap-[10px] max-h-[710px] min-h-[200px] overflow-y-auto scrollbar-hide">
          {tasksLoad.state.status === "loading" ? (
            <div className="h-full flex items-center justify-center flex-grow" role="status">
              <span className={`${isDark ? 'text-gray-300' : 'text-[#676767]'} text-sm font-lato`}>Loading tasks…</span>
            </div>
          ) : tasksLoad.state.status === "error" ? (
            <LoadError
              widget="this project's tasks"
              failure={tasksLoad.state.failure}
              onRetry={tasksLoad.onRetry}
              retrying={tasksLoad.retrying}
              dark={isDark}
            />
          ) : tasks.length != 0 ? tasks.map((task, index) => (
            <TaskCard key={index} task={task} handleUpdateTask={handleUpdateTask} onStatusError={onStatusError} handleDeleteTask={handleDeleteTask} />
          )) : (
            <div className="h-full flex items-center justify-center flex-grow">
              <h1 className={`${isDark ? 'text-white' : 'text-text'} text-[20px] font-bold font-lato text-center`}>
                No tasks found
              </h1>
            </div>
          )}
        </div>

        <div className="flex flex-row justify-between w-full items-center">
          <button className="bg-primary-default rounded-[5px] flex justify-center items-center text-white font-lato 
            text-xs p-[10px] hover:bg-primary-200 transition-colors duration-200" 
            onClick={handleCreateTask}>
            <svg width="20" height="20" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.7501 12.499H5.25012M12.0001 5.74902V19.249V5.74902Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            New Task
          </button>

          <div className="flex flex-row gap-2 items-center">
          {canManageProject ? extraActions : null}
          <button className={`border ${isDark ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-primary-200 text-primary-default hover:bg-gray-50'} 
            rounded-[5px] flex justify-center items-center font-lato text-xs p-[10px] px-4 transition-colors duration-200`} 
            onClick={onClose}>
            Cancel
          </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TaskCardProps {
  task: ITask;
  handleUpdateTask: (task: ITask) => void;
  onStatusError: (message: string) => void;
  handleDeleteTask: (taskId: string, title: string) => void;
}

const TaskCard = ({ task, handleUpdateTask, onStatusError, handleDeleteTask }: TaskCardProps) => {
  const { isDark } = useAppearance();
  const setStatus = useSetTaskStatus(task.task_id);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Priority colors for light and dark modes
  const priorityColor = task.priority === "Low" 
    ? isDark ? "bg-green-900/30" : "bg-secondary-200" 
    : task.priority === "Medium" 
      ? isDark ? "bg-yellow-900/30" : "bg-accent-200" 
      : isDark ? "bg-red-900/30" : "bg-error-200";
      
  const priorityTextColor = task.priority === "Low" 
    ? isDark ? "text-green-300" : "text-secondary-500" 
    : task.priority === "Medium" 
      ? isDark ? "text-yellow-300" : "text-accent-500" 
      : isDark ? "text-red-300" : "text-error-500";

  const handleCheckToggle = () => {
    if (setStatus.isPending) return;
    const audio = new Audio('/soundfx/3.mp3'); 
    audio.play();
    const nextStatus: ITask["status"] = task.status === "Complete" ? "Pending" : "Complete";
    // The status endpoint (not a full task update), so the backend's task.completed
    // notification fires from the project view too.
    setStatus.mutate(
      { taskId: task.task_id, to: nextStatus, from: task.status },
      {
        onError: (error) => {
          const failure = failureOf(error);
          if (isUserFacing(failure)) onStatusError(failure.message);
        },
      }
    );
  };

  return (
    <div className={`border ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-[#E0E0E0] bg-white'} rounded-[10px] py-2 px-5 flex flex-row transition-colors duration-200`}>
      <div 
        className="flex flex-row justify-between w-full" 
        onMouseEnter={() => setShowDeleteModal(true)} 
        onMouseLeave={() => setShowDeleteModal(false)}
        onFocus={() => setShowDeleteModal(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setShowDeleteModal(false);
        }}
      >
        {/* Mouse convenience; the title button below is the keyboard and screen-reader control. */}
        <div 
          role="presentation"
          className="flex flex-row gap-[10px] items-center w-full" 
          onClick={() => {
            handleUpdateTask(task)
          }}
        >
          <div 
            className={`w-[15px] h-[15px] rounded-full mr-4 ${
              task.status === "Complete" 
                ? "bg-success-500" 
                : isDark ? "bg-yellow-500/80" : "bg-[#FFC107]"
            }`}
          />
          <div className="flex flex-col gap-[10px] justify-center items-center w-full">
            <div className="flex flex-row gap-[10px] w-full items-center">
              <h1 
                className={`text-sm font-bold font-lato flex-1 ${
                  task.status === "Complete" 
                    ? `line-through ${isDark ? 'text-gray-400' : 'text-[#828282]'}` 
                    : isDark ? 'text-white' : 'text-text'
                }`}
              >
                <button
                  type="button"
                  className="text-left"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUpdateTask(task)
                  }}
                >
                  {task.title}
                </button>
              </h1>
              <div 
                className={`${priorityColor} flex items-center px-[6px] h-[20px] rounded-full ${priorityTextColor} text-[11px] font-lato font-bold ${
                  task.status === "Complete" ? "line-through" : ""
                }`}
              >
                {task.priority} Priority
              </div>
            </div>
            {task.description && (
              <p className={`text-xs font-lato w-full text-start ${
                isDark ? 'text-gray-300' : 'text-[#676767]'
              }`}>
                {task.description}
              </p>
            )}
            <div className="w-full">
              <AssigneeChip task={task} dark={isDark} />
            </div>
          </div>
        </div>

        <div className="h-full flex items-center w-[60px] gap-[10px] justify-end">
          {/* FEAT-09: the server decides who may delete (the owner, or the task's creator).
              BUG-05: always mounted (shown on hover or focus), so focus can return to it when the
              confirm closes. */}
          {canDeleteTask(task) && (
            <button
              type="button"
              aria-label={`Delete task ${task.title}`}
              className={`cursor-pointer hover:opacity-80 transition-opacity ${showDeleteModal ? "opacity-100" : "opacity-0 focus-visible:opacity-100"}`}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTask(task.task_id, task.title);
              }}
            >
              <Image 
                src="/svgs/trash-outline.svg" 
                alt="" 
                width={20} 
                height={20} 
              />
            </button>
          )}
          <div className="group min-w-5 h-5 relative">
            <input
              id="checkTask"
              type="checkbox"
              checked={task.status === "Complete"}
              readOnly
              onClick={(e) => {
                e.stopPropagation();
                handleCheckToggle();
              }}
              className="peer appearance-none min-w-5 h-full cursor-pointer"
            />
            <div
              className={`absolute inset-0 rounded-[10px] border-[2px] border-solid ${
                isDark ? 'border-gray-600' : 'border-primary-200'
              } peer-checked:border-0 group-hover:border-0 pointer-events-none`}
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 peer-checked:opacity-100 pointer-events-none">
              <Image 
                src="/svgs/checkmark-circle-yellow.svg" 
                alt="Check" 
                width={20} 
                height={20} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}