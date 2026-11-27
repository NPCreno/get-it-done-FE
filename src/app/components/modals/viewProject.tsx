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
 

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        overlayClassName="fixed inset-0 bg-th-overlay flex justify-center items-center z-50"
        className="modal-popup bg-th-card w-[550px] h-auto rounded-card p-5 shadow-lg flex flex-col gap-5"
      >
        <div className="flex flex-col">
          <div className="flex flex-row justify-between items-center">
            <DialogTitle className="text-th-ink text-[20px] font-card [font-weight:var(--w-card)]">{project.title}</DialogTitle>
            <DialogClose asChild>
            <button type="button" className="cursor-pointer" aria-label="Close">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.5 4.50098L4.5 11.501M11.5 11.501L4.5 4.50098L11.5 11.501Z" stroke="var(--ico-x)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            </DialogClose>
          </div>
          <DialogDescription className="text-th-ink-note text-sm font-ui">
            {project.description ? project.description : "View and manage tasks in this project"}
          </DialogDescription>
        </div>

        <div className="flex flex-col gap-[10px] max-h-[710px] min-h-[200px] overflow-y-auto scrollbar-hide">
          {tasksLoad.state.status === "loading" ? (
            <div className="h-full flex items-center justify-center flex-grow" role="status">
              <span className="text-th-ink-note text-sm font-ui">Loading tasks…</span>
            </div>
          ) : tasksLoad.state.status === "error" ? (
            <LoadError
              widget="this project's tasks"
              failure={tasksLoad.state.failure}
              onRetry={tasksLoad.onRetry}
              retrying={tasksLoad.retrying}
            />
          ) : tasks.length != 0 ? tasks.map((task, index) => (
            <TaskCard key={index} task={task} handleUpdateTask={handleUpdateTask} onStatusError={onStatusError} handleDeleteTask={handleDeleteTask} />
          )) : (
            <div className="h-full flex items-center justify-center flex-grow">
              <h1 className="text-th-ink text-[20px] font-card [font-weight:var(--w-card)] text-center">
                No tasks found
              </h1>
            </div>
          )}
        </div>

        <div className="flex flex-row justify-between w-full items-center">
          <button className="bg-th-acc rounded-btn flex justify-center items-center text-th-on-acc font-ui
            text-xs p-[10px] hover:bg-th-acc-soft transition-colors duration-200"
            onClick={handleCreateTask}>
            <svg width="20" height="20" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.7501 12.499H5.25012M12.0001 5.74902V19.249V5.74902Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            New Task
          </button>

          <div className="flex flex-row gap-2 items-center">
          {canManageProject ? extraActions : null}
          <button className="border border-th-line-acc text-th-btn2-t hover:bg-th-btn2-hover
            rounded-btn flex justify-center items-center font-ui text-xs p-[10px] px-4 transition-colors duration-200"
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
  const setStatus = useSetTaskStatus(task.task_id);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Priority chip colours: theme tokens (Classic = today's chips in each mode)
  const priorityColor = task.priority === "Low"
    ? "bg-th-vprio-low-bg"
    : task.priority === "Medium"
      ? "bg-th-vprio-med-bg"
      : "bg-th-vprio-high-bg";

  const priorityTextColor = task.priority === "Low"
    ? "text-th-vprio-low-t"
    : task.priority === "Medium"
      ? "text-th-vprio-med-t"
      : "text-th-vprio-high-t";

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
    <div className="border border-th-row-edge bg-th-row-bg rounded-card py-2 px-5 flex flex-row transition-colors duration-200">
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
                ? "bg-th-done-dot"
                : "bg-th-pend-dot"
            }`}
          />
          <div className="flex flex-col gap-[10px] justify-center items-center w-full">
            <div className="flex flex-row gap-[10px] w-full items-center">
              <h1
                className={`text-sm font-bold font-ui flex-1 ${
                  task.status === "Complete"
                    ? "line-through text-th-done-ink"
                    : "text-th-ink"
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
                className={`${priorityColor} flex items-center px-[6px] h-[20px] rounded-full ${priorityTextColor} text-[11px] font-ui font-bold ${
                  task.status === "Complete" ? "line-through" : ""
                }`}
              >
                {task.priority} Priority
              </div>
            </div>
            {task.description && (
              <p className="text-xs font-ui w-full text-start text-th-ink-note">
                {task.description}
              </p>
            )}
            <div className="w-full">
              <AssigneeChip task={task} />
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
              className="absolute inset-0 rounded-[10px] border-[2px] border-solid border-th-line-acc peer-checked:border-0 group-hover:border-0 pointer-events-none"
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