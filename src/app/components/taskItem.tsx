import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import { updateTaskStatus, updateSubTaskStatus, createSubTaskApi } from "@/app/api/taskRequests";
import { useFormState } from "../context/FormProvider";
import { ITask } from "../interface/ITask";
import { ISubTask } from '../interface/ISubTask';
import { CreateSubTaskDto } from '../interface/dto/create-subTask-dto';
import { FormikErrors, useFormik } from 'formik';
import { createSubTaskSchema } from '../schemas/createSubTaskSchema';
import { ISubTaskFormValues } from '../interface/forms/ISubTaskFormValues';

interface TaskItemProps {
  task: ITask;
  handleUpdateTask: () => void;
  handleDeleteTask: (taskId: string) => void;
  handleDeleteSubTask: (taskSubInstance_id: string) => void;
  handleDeleteRecurringTasks: (taskTemplate_id: string, taskId: string) => void;
  taskUpdateStatus?: (message: string, type: 'info' | 'success' | 'error' | 'warning', task: ITask) => void;
  subTasks?: ISubTask[] | null;
  showSubtasks?: boolean;
  onToggleSubtasks?: (taskId: string) => void;
}

export function TaskItem({ 
  task, 
  handleUpdateTask, 
  handleDeleteTask,
  handleDeleteSubTask,
  taskUpdateStatus,
  handleDeleteRecurringTasks,
  subTasks,
  showSubtasks = false,
  onToggleSubtasks
}: TaskItemProps) {
  const { setSelectedTaskData, userData, setUserData } = useFormState();
  const [updateState, setUpdateState] = useState<{ 
    status: string | null;
    isUpdating: boolean;
    controller: AbortController | null;
  }>({ status: null, isUpdating: false, controller: null });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState<{[key: string]: boolean}>({});
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const subtaskInputRef = useRef<HTMLInputElement>(null);
  const currentStatus = updateState.status || task.status;
  const isComplete = currentStatus === "Complete";
  const isUpdating = updateState.isUpdating;
  const hasSubtasks = subTasks && subTasks.length > 0;

  const initialValues = useMemo<ISubTaskFormValues>(
    () => ({
      user_id: userData?.user_id ?? "",
      title: "",
      task_id: task.task_id,
      due_date: null,
      status: "Pending",
    }),
    [userData?.user_id, task.task_id]
  );
  
  const {
    setFieldValue,
    validateForm,
    values,
    setSubmitting,
  } = useFormik({
    initialValues,
    enableReinitialize: true,
    validationSchema: createSubTaskSchema,
    validateOnChange: false, // Disable real-time validation
    validateOnBlur: false,
    onSubmit: async (values: ISubTaskFormValues) => {
      handleSubmitForm(values);
    },
  });

  const handleSubmitForm = async (formValues: ISubTaskFormValues) => {
    const validationErrors: FormikErrors<ISubTaskFormValues> = await validateForm(formValues);
    if (Object.keys(validationErrors).length === 0) {
      try {
        // Create a new subtask with proper typing
        const subTaskData: CreateSubTaskDto = {
          title: formValues.title,
          task_id: formValues.task_id,
          user_id: formValues.user_id,
          due_date: formValues.due_date || undefined,
          status: formValues.status,
        };

        const response = await createSubTaskApi(subTaskData);
        
        if (response && response.status === 'success') {
          // Refresh the task to show the new subtask
          taskUpdateStatus?.('Subtask added successfully', 'success', task);
          // Clear the input for the next subtask
          setFieldValue('title', '');
          // Keep the input focused for rapid entry
          subtaskInputRef.current?.focus();
        }
      } catch (error) {
        console.error('Error creating subtask:', error);
        taskUpdateStatus?.('Failed to create subtask', 'error', task);
      }
    }
    setSubmitting(false);
  };
  
    
  // Focus the input when adding a new subtask
  useEffect(() => {
    if (isAddingSubtask && subtaskInputRef.current) {
      subtaskInputRef.current.focus();
    }
  }, [isAddingSubtask]);

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
  }, [handleDeleteTask, isDeleting, taskUpdateStatus, task]);

  const handleDeleteSub = useCallback(async (taskSubInstance_id: string) => {
    // Prevent multiple delete attempts for the same task
    if (isDeleting[taskSubInstance_id]) {
      console.log('Delete already in progress for subtask:', taskSubInstance_id);
      return;
    }
    
    try {
      setIsDeleting(prev => ({ ...prev, [taskSubInstance_id]: true }));  // Mark this task as being deleted
      
      // Create a promise with a timeout
      const deletePromise = handleDeleteSubTask(taskSubInstance_id);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Delete operation timed out')), 10000)
      );
      
      // Race between the delete operation and timeout
      await Promise.race([deletePromise, timeoutPromise]);
      
      // If we get here, the delete was successful
      taskUpdateStatus?.('SubTask deleted successfully', 'success', task);
      return true;
      
    } catch (error) {
      console.error('Error deleting task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete subtask';
      taskUpdateStatus?.(`Delete failed: ${errorMessage}`, 'error', task);
      
      // Re-throw to allow parent component to handle the error if needed
      throw error;
      
    } finally {
      // Clean up the loading state
      setIsDeleting(prev => {
        const newState = { ...prev };
        delete newState[taskSubInstance_id];
        return newState;
      });
    }
  }, [handleDeleteSubTask, isDeleting, taskUpdateStatus, task]);

  const handleCheckToggle = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, type: 'task' | 'subtask', subtaskId?: string) => {
    e.stopPropagation();
    // Debounce rapid clicks
    if (isUpdating) {
      console.log('Update already in progress, ignoring click');
      return;
    }

    let controller: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // Set updating state with controller
      controller = new AbortController();
      setUpdateState(prev => ({
        ...prev,
        isUpdating: true,
        controller
      }));
      
      const newStatus = type === 'task' 
        ? (task.status === "Complete" ? "Pending" : "Complete") 
        : (subTasks?.find(subtask => subtask.taskSubInstance_id === subtaskId)?.status === "Complete" ? "Pending" : "Complete");
      
      const statusText = newStatus === "Complete" ? "completed" : "marked as pending";
      const itemType = type === 'task' ? 'Task' : 'Subtask';
      
      // Play sound effect
      const audio = new Audio('/soundfx/3.mp3');
      audio.play().catch(error => console.warn('Audio playback failed:', error));
      
      // Show updating message
      taskUpdateStatus?.(`Updating ${itemType.toLowerCase()} status...`, 'info', task);
      
      // Optimistic UI update - only update the specific item's status
      setUpdateState(prev => ({
        ...prev,
        status: type === 'task' ? newStatus : prev.status
      }));
      
      // Make API call with timeout
      timeoutId = setTimeout(() => {
        if (controller) {
          controller.abort();
        }
      }, 10000);
      
      // Check if update was aborted before making API call
      if (controller?.signal.aborted) {
        throw new Error('Update was cancelled');
      }

      let response;
      if (type === 'task') {
        // For task updates, just update the task status
        response = await Promise.race([
          updateTaskStatus(task.task_id, newStatus),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out. Please try again.')), 10000)
          )
        ]) as { status: string; message?: string };
      } else {
        // Handle subtask update
        if (!subtaskId) {
          throw new Error('Subtask ID is missing');
        }
        
        // First, update the subtask status
        response = await Promise.race([
          updateSubTaskStatus(subtaskId, newStatus),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out. Please try again.')), 10000)
          )
        ]) as { status: string; message?: string };
        
        // After successful subtask update, check if we need to update the parent task status
        if (subTasks) {
          const updatedSubtasks = subTasks.map(st => 
            st.taskSubInstance_id === subtaskId 
              ? { ...st, status: newStatus }
              : st
          );
          
          // Check if all subtasks are now complete
          const allSubtasksComplete = updatedSubtasks.every(st => st.status === 'Complete');
          
          // Only update parent task if all subtasks are complete or if parent is complete but shouldn't be
          if (allSubtasksComplete || task.status === 'Complete') {
            const parentStatus = allSubtasksComplete ? 'Complete' : 'Pending';
            await updateTaskStatus(task.task_id, parentStatus);
          }
        }
      }
      
      if (response?.status !== "success") {
        throw new Error(response?.message || `Failed to update ${itemType.toLowerCase()} status`);
      }
      
      // Show success message
      taskUpdateStatus?.(`${itemType} ${statusText} successfully!`, 'success', task);
      
    } catch (error) {
      console.error(`Error updating ${type} status:`, error);
      const errorMessage = error instanceof Error ? error.message : `Failed to update ${type} status`;
      taskUpdateStatus?.(errorMessage, 'error', task);
      
      // Re-throw the error to be caught by the outer catch block if needed
      throw error;
    } finally {
      // Clear the timeout if it exists
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Clean up controller if it exists
      if (controller) {
        controller.abort();
      }
      
      // Reset update state
      setUpdateState({
        status: null,
        isUpdating: false,
        controller: null
      });
    }
  }, [isUpdating, task, subTasks, taskUpdateStatus]);

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

  // Get priority color class
  const priorityColor = priorityColors[task.priority as keyof typeof priorityColors] || '';

  return (
    <div className="w-full">
      <div 
        className={`flex flex-row w-full h-[46px] items-center rounded-[10px] ${userData?.theme === "dark" ? "hover:bg-gray-900" : "hover:bg-[#FAFAFA] "} cursor-pointer gap-3 pr-4 pl-3 mb-1 ${
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
              onChange={(e) => handleCheckToggle(e, 'task')}
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
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSubtasks?.(task.task_id);
                    if (!showSubtasks) {
                      setIsAddingSubtask(true);
                    }
                  }}
                  className={`p-1 -mr-2 ${hasSubtasks ? 'text-gray-600' : 'text-gray-300 hover:text-gray-600'}`}
                  aria-label={showSubtasks ? 'Hide subtasks' : 'Show subtasks'}
                >
                  <svg 
                    className={`w-4 h-4 transform transition-transform ${showSubtasks ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtasks Section */}
      {showSubtasks && (
        <div className="ml-8 pl-2 border-l-2 border-gray-200">
          {/* Subtasks List */}
          {hasSubtasks && subTasks.map((subtask) => (
            <div key={subtask.taskSubInstance_id} className="flex items-center py-1 px-3">
              <div className="group w-6 h-6 relative">
                <input
                  type="checkbox"
                  id={`subtask-${subtask.taskSubInstance_id}`}
                  checked={subtask.status === 'Complete'}
                  onChange={(e) => handleCheckToggle(e, 'subtask', subtask.taskSubInstance_id)}
                  onClick={e => e.stopPropagation()}
                  className="peer appearance-none w-full h-full cursor-pointer"
                  aria-label={subtask.status === 'Complete' ? 'Mark subtask as pending' : 'Mark subtask as complete'}
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
              <span className={`text-sm ml-2 flex-1 ${subtask.status === 'Complete' ? 'line-through text-start text-gray-400' : 'text-start text-gray-700'}`}>
                {subtask.title}
              </span>
              <button 
                className="text-gray-400 hover:text-gray-600 p-1 -mr-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSub(subtask.taskSubInstance_id)
                }}
                title="Delete subtask"
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                  />
                </svg>
              </button>
            </div>
          ))}
          
          {/* Add Subtask Input */}
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <input
                ref={subtaskInputRef}
                type="text"
                className="flex-1 text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-default focus:border-primary-default"
                placeholder="Add a subtask"
                value={values.title}
                onChange={(e) => setFieldValue('title', e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation(); // Prevent event from bubbling up
                  if (e.key === 'Enter' && values.title.trim()) {
                    e.preventDefault(); // Prevent form submission if inside a form
                    handleSubmitForm({
                      ...values,
                      title: values.title.trim()
                    });
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setFieldValue('title', '');
                    setIsAddingSubtask(false);
                  }
                }}
                onBlur={() => {
                  if (!values.title.trim()) {
                    setIsAddingSubtask(false);
                  }
                }}
                autoFocus={isAddingSubtask}
              />
              {isAddingSubtask && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddingSubtask(false);
                    setFieldValue('title', '');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Cancel adding subtask"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}