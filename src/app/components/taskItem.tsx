import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { updateTaskStatus } from "../api/taskRequests";
import { useFormState } from "../context/FormProvider";
import { ITask } from "../interface/ITask";

interface TaskItemProps {
  task: ITask;
  handleUpdateTask: () => void;
  taskUpdateStatus?: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export function TaskItem({ 
  task, 
  handleUpdateTask, 
  taskUpdateStatus 
}: TaskItemProps) {
  const { setSelectedTaskData } = useFormState();
  const [updateState, setUpdateState] = useState<{ 
    status: string | null;
    isUpdating: boolean;
    controller: AbortController | null;
  }>({ status: null, isUpdating: false, controller: null });

  const currentStatus = updateState.status || task.status;
  const isComplete = currentStatus === "Complete";
  const isUpdating = updateState.isUpdating;

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
      taskUpdateStatus?.("Updating task status...", 'info');
      
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
        taskUpdateStatus?.(`Task ${statusText} successfully!`, 'success');
        
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
      taskUpdateStatus?.(errorMessage, 'error');
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

  return (
    <div 
      className={`flex flex-row w-full h-[42px] items-center justify-between rounded-[10px] hover:bg-[#FAFAFA] cursor-pointer gap-5 pr-5 pl-5 ${isUpdating ? 'opacity-70' : ''}`}
      onClick={() => {
        setSelectedTaskData(task);
        handleUpdateTask();
      }}
    >
      <div className="flex flex-row gap-5 items-center">
        <div 
          className="group w-6 h-6 relative"
          
        >
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
      
      <div className="flex flex-row gap-5 items-center flex-grow w-full justify-end">
        <div className="flex flex-row justify-between w-full">
          <span className={`font-lato text-4 text-text ${isComplete ? 'line-through' : ''}`}>
            {task.title}
          </span>
          <div className="flex flex-row gap-2 items-center">
            {task.project_title && (
              <div className="bg-[#D4D4D4] font-lato text-[13px] text-text font-bold rounded-[10px] px-2 h-[25px] flex items-center justify-center">
                {task.project_title}
              </div>
            )}
            <div 
              className={`rounded-[10px] w-[10px] h-[10px] ${isComplete ? 'bg-green-600' : 'bg-[#FFC087]'}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}