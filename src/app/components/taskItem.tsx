import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { updateTaskStatus } from "../api/taskRequests";
import { useFormState } from "../context/FormProvider";
import { ITask } from "../interface/ITask";
import { format } from 'date-fns';

interface TaskItemProps {
  task: ITask;
  handleUpdateTask: () => void;
  handleDeleteTask: (taskId: string) => void;
  handleDeleteRecurringTasks: (taskTemplate_id: string, taskId: string) => void;
  taskUpdateStatus?: (message: string, type: 'info' | 'success' | 'error' | 'warning', task: ITask) => void;
}

export function TaskItem({ 
  task, 
  handleUpdateTask, 
  handleDeleteTask,
  taskUpdateStatus,
  handleDeleteRecurringTasks,
}: TaskItemProps) {
  const { setSelectedTaskData } = useFormState();
  const [updateState, setUpdateState] = useState<{ 
    status: string | null;
    isUpdating: boolean;
    controller: AbortController | null;
  }>({ status: null, isUpdating: false, controller: null });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState<{[key: string]: boolean}>({});
  const currentStatus = updateState.status || task.status;
  const isComplete = currentStatus === "Complete";
  const isUpdating = updateState.isUpdating;

  const handleDelete = useCallback(async (taskId: string) => {
    // Prevent multiple delete attempts for the same task
    if (isDeleting[taskId]) {
      console.log('Delete already in progress for task:', taskId);
      return;
    }
    
    try {
      // Mark this task as being deleted
      setIsDeleting(prev => ({ ...prev, [taskId]: true }));
      
      // Create a promise with a timeout
      const deletePromise = handleDeleteTask(taskId);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Delete operation timed out')), 10000)
      );
      
      // Race between the delete operation and timeout
      await Promise.race([deletePromise, timeoutPromise]);
      
      // If we get here, the delete was successful
      taskUpdateStatus?.('Task deleted successfully', 'success', task);
      return true;
      
    } catch (error) {
      console.error('Error deleting task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete task';
      taskUpdateStatus?.(`Delete failed: ${errorMessage}`, 'error', task);
      
      // Re-throw to allow parent component to handle the error if needed
      throw error;
      
    } finally {
      // Clean up the loading state
      setIsDeleting(prev => {
        const newState = { ...prev };
        delete newState[taskId];
        return newState;
      });
    }
  }, [handleDeleteTask, isDeleting, taskUpdateStatus]);

  const handleCheckToggle = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    
    // Debounce rapid clicks
    if (isUpdating) {
      console.log('Update already in progress, ignoring click');
      return;
    }

    try {
      // Set updating state with controller
      const controller = new AbortController();
      setUpdateState({
        status: null,
        isUpdating: true,
        controller
      });
      
      const newStatus = task.status === "Complete" ? "Pending" : "Complete";
      const statusText = newStatus === "Complete" ? "completed" : "marked as pending";
      
      // Play sound effect
      const audio = new Audio('/soundfx/3.mp3');
      audio.play().catch(error => console.warn('Audio playback failed:', error));
      
      // Show updating message
      taskUpdateStatus?.("Updating task status...", 'info', task);
      
      // Optimistic UI update
      setUpdateState(prev => ({
        ...prev,
        status: newStatus
      }));
      
      // Make API call with timeout
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        // Check if update was aborted before making API call
        if (controller.signal.aborted) {
          throw new Error('Update was cancelled');
        }

        const response = await Promise.race([
          updateTaskStatus(task.task_id, newStatus),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out. Please try again.')), 10000)
          )
        ]) as { status: string; message?: string };
        
        if (response.status !== "success") {
          throw new Error(response.message || 'Failed to update task status');
        }
        
        // Show success message
        taskUpdateStatus?.(`Task ${statusText} successfully!`, 'success', task);
        
      } catch (error) {
        // Check if error was due to abort
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Update was cancelled');
          return;
        }
        
        // Revert optimistic update on error
        setUpdateState(prev => ({
          ...prev,
          status: null
        }));
        throw error;
      } finally {
        clearTimeout(timeoutId);
        // Clean up controller
        controller.abort();
      }
      
    } catch (error) {
      console.error("Error updating task status:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update task status';
      taskUpdateStatus?.(errorMessage, 'error', task);
    } finally {
      // Reset update state
      setUpdateState({
        status: null,
        isUpdating: false,
        controller: null
      });
    }
  }, [task.status, task.task_id, taskUpdateStatus, isUpdating]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (updateState.controller) {
        updateState.controller.abort();
      }
    };
  }, [updateState.controller]);

  // Priority color mapping (more subtle)
  const priorityColors = {
    'Low': 'border-l-2 border-blue-400',
    'Medium': 'border-l-2 border-orange-400',
    'High': 'border-l-2 border-red-400',
  };

  // Check if task is overdue
  const isOverdue = (dueDate: string): boolean => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskDate = new Date(dueDate);
      return taskDate < today;
    } catch (error) {
      console.error("Error checking if task is overdue:", error);
      return false;
    }
  };

  // Format due date
  const formatDueDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d');
    } catch (error) {
      console.error("Error formatting due date:", error);
      return '';
    }
  };

  // Get priority color class
  const priorityColor = priorityColors[task.priority as keyof typeof priorityColors] || '';

  return (
    <div 
      className={`flex flex-row w-full h-[46px] items-center rounded-[10px] hover:bg-[#FAFAFA] cursor-pointer gap-3 pr-4 pl-3 mb-1 ${
        isComplete ? 'opacity-70' : ''
      } ${priorityColor}`}
      onClick={() => {
        setSelectedTaskData(task);
        handleUpdateTask();
      }}
      onMouseEnter={() => setShowDeleteModal(true)} 
      onMouseLeave={() => setShowDeleteModal(false)}
    >
      <div className="flex items-center justify-center">
        <div className="group w-6 h-6 relative">
          <input
            id={`checkTask-${task.task_id}`}
            type="checkbox"
            onChange={handleCheckToggle}
            onClick={e => e.stopPropagation()}
            checked={isComplete}
            disabled={isUpdating}
            aria-label={isComplete ? 'Mark task as pending' : 'Mark task as complete'}
            className="peer appearance-none w-full h-full cursor-pointer"
          />
          <div className="absolute inset-0 rounded-full border-[2px] border-solid border-gray-300 peer-checked:border-0 group-hover:border-0 pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 peer-checked:opacity-100 pointer-events-none">
            <Image
              src="/svgs/checkmark-circle-green.svg"
              alt="Check"
              width={26}
              height={26}
            />
          </div>
        </div>
      </div>
      
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col items-start">
            <span className={`font-lato text-4 text-text ${isComplete ? 'line-through' : ''} truncate`}>
              {task.title}
            </span>
            {task.description && (
          <p className="text-xs text-gray-400 truncate">
            {task.description}
          </p>
        )}
          </div>
          <div className="flex flex-row gap-2">            
            {showDeleteModal && (
              <div 
                className={`cursor-pointer ${isDeleting ? 'opacity-50' : ''}`} 
                onClick={(e) => {
                  e.stopPropagation();
                  if(task.template_id){
                    handleDeleteRecurringTasks(task.template_id, task.task_id);
                  }
                  else{
                    handleDelete(task.task_id);
                  }
                }}
                title={isDeleting ? 'Deleting...' : 'Delete task'}
              >
                <Image 
                  src="/svgs/trash-outline.svg" 
                  alt={isDeleting ? 'Deleting...' : 'Delete'} 
                  width={20} 
                  height={20} 
                  className={isDeleting ? 'animate-pulse' : ''}
                />
              </div>
            )}
            <div className="flex items-center space-x-2 ml-2">
              {task.due_date && (
                <span className={`text-xs whitespace-nowrap ${
                  isOverdue(task.due_date.toString()) && !isComplete 
                    ? 'text-red-500 font-medium' 
                    : 'text-gray-400'
                }`}>
                  {formatDueDate(task.due_date.toString())}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}