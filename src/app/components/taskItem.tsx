import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import { isUserFacing } from "@/lib/apiClient";
import { useCreateSubTask, useDeleteSubTask, useSetSubTaskStatus, useSetTaskStatus } from "@/lib/query/mutations";
import { failureOf } from "@/lib/query/unwrap";
import { useFormState } from "../context/FormProvider";
import { ITask } from "../interface/ITask";
import { ISubTask } from '../interface/ISubTask';
import { toCreateSubTaskRequest } from '../contracts/mappers';
import { FormikErrors, useFormik } from 'formik';
import { createSubTaskSchema } from '../schemas/createSubTaskSchema';
import { ISubTaskFormValues } from '../interface/forms/ISubTaskFormValues';
import InputBox from './inputBox';

interface TaskItemProps {
  task: ITask;
  handleUpdateTask: () => void;
  handleDeleteTask: (taskId: string) => void;
  handleDeleteRecurringTasks: (taskTemplate_id: string, taskId: string) => void;
  /** Toast only. */
  notify?: (message: string, type: 'info' | 'success' | 'error' | 'warning') => void;
  subTasks?: ISubTask[] | null;
  showSubtasks?: boolean;
  onToggleSubtasks?: (taskId: string) => void;
}

export function TaskItem({ 
  task, 
  handleUpdateTask, 
  handleDeleteTask,
  notify,
  handleDeleteRecurringTasks,
  subTasks,
  showSubtasks = false,
  onToggleSubtasks
}: TaskItemProps) {
  const { setSelectedTaskData, userData } = useFormState();
  // Server data goes through mutations: optimistic status, per-parent serialization
  // (scope) and invalidation live in lib/query. This component keeps no request state.
  const setTaskStatus = useSetTaskStatus(task.task_id);
  const setSubTaskStatus = useSetSubTaskStatus(task.task_id);
  const createSubTask = useCreateSubTask(task.task_id);
  const deleteSubTask = useDeleteSubTask(task.task_id);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState<{[key: string]: boolean}>({});
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const subtaskInputRef = useRef<HTMLInputElement>(null);
  const isComplete = task.status === "Complete"; // already optimistic when a toggle is pending
  const isUpdating = setTaskStatus.isPending || setSubTaskStatus.isPending;
  const hasSubtasks = subTasks && subTasks.length > 0;

  const initialValues = useMemo<ISubTaskFormValues>(
    () => ({
      title: "",
      task_id: task.task_id,
      due_date: null,
      status: "Pending",
    }),
    [task.task_id]
  );
  
  const {
    setFieldValue,
    validateForm,
    errors,
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
      createSubTask.mutate(toCreateSubTaskRequest(formValues), {
        onSuccess: () => {
          notify?.('Subtask added successfully', 'success');
          // Clear the input for the next subtask and keep it focused for rapid entry
          setFieldValue('title', '');
          subtaskInputRef.current?.focus();
        },
        onError: (error) => {
          const failure = failureOf(error);
          if (isUserFacing(failure)) {
            notify?.(failure.kind === 'api' ? failure.message : 'Failed to create subtask', 'error');
          }
        },
      });
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
      notify?.('Task deleted successfully', 'success');
      return true;
      
    } catch (error) {
      console.error('Error deleting task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete task';
      notify?.(`Delete failed: ${errorMessage}`, 'error');
      
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
  }, [handleDeleteTask, isDeleting, notify]);

  const handleDeleteSub = useCallback((taskSubInstance_id: string) => {
    if (deleteSubTask.isPending) return;
    deleteSubTask.mutate(taskSubInstance_id, {
      onSuccess: () => notify?.('SubTask deleted successfully', 'success'),
      onError: (error) => {
        const failure = failureOf(error);
        if (isUserFacing(failure)) notify?.(`Delete failed: ${failure.message}`, 'error');
      },
    });
  }, [deleteSubTask, notify]);

  const handleCheckToggle = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'task' | 'subtask', subtaskId?: string) => {
    e.stopPropagation();
    // The checkbox is disabled while pending; this guards rapid double clicks.
    if (isUpdating) return;

    const itemType = type === 'task' ? 'Task' : 'Subtask';
    const newStatus = type === 'task'
      ? (task.status === "Complete" ? "Pending" : "Complete")
      : (subTasks?.find(st => st.taskSubInstance_id === subtaskId)?.status === "Complete" ? "Pending" : "Complete");
    const statusText = newStatus === "Complete" ? "completed" : "marked as pending";

    const audio = new Audio('/soundfx/3.mp3');
    audio.play().catch(error => console.warn('Audio playback failed:', error));

    const handlers = {
      onSuccess: () => notify?.(`${itemType} ${statusText} successfully!`, 'success'),
      onError: (error: unknown) => {
        const failure = failureOf(error);
        if (!isUserFacing(failure)) return;
        const parentStage = (error as { stage?: string }).stage === 'parent';
        notify?.(parentStage ? 'Subtask updated, but the task status could not be updated.' : failure.message, 'error');
      },
    };

    if (type === 'task') {
      setTaskStatus.mutate({ taskId: task.task_id, to: newStatus, from: task.status }, handlers);
    } else {
      if (!subtaskId) return;
      setSubTaskStatus.mutate({ taskId: task.task_id, subtaskId, to: newStatus }, handlers);
    }
  }, [isUpdating, task.task_id, task.status, subTasks, notify, setTaskStatus, setSubTaskStatus]);

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
        className={`flex flex-row w-full h-[46px] items-center rounded-[10px] ${userData?.theme === "dark" ? "hover:bg-gray-900" : "hover:bg-[#FAFAFA] "} 
          cursor-pointer gap-3 pr-4 pl-3 mb-1 ${isComplete ? 'opacity-70' : ''} ${priorityColor}`}
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
              <span className={`flex-1 font-lato text-4 ${task.status === 'Complete' 
                ? 'line-through text-start text-gray-400' 
                : `text-start ${userData?.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}`}>
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
              <span className={`text-sm ml-2 flex-1 ${subtask.status === 'Complete' 
                ? 'line-through text-start text-gray-400' 
                : `text-start ${userData?.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}`}>
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
              <InputBox
                ref={subtaskInputRef}
                type="text"
                placeholder="Enter subtask title"
                value={{ name: values.title }}
                onChange={(e) => setFieldValue("title", e.target.value)}
                isLabelVisible={false}
                error={errors.title}
                customClass="fade-in-delay-1"
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