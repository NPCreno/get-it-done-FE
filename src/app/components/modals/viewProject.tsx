import React, { useCallback, useEffect, useState } from 'react';
import { IProject } from '@/app/interface/IProject';
import { ITask } from '@/app/interface/ITask';
import { useFormStore } from '@/app/store/useFormStore';
import Image from 'next/image';
interface ViewProjectModalProps {
  onClose: () => void;
  project: IProject;
  handleCreateTask: () => void;
  tasks: ITask[];
  handleUpdateTask: () => void;
  handleTaskStatus: (task: ITask) => void;
  handleDeleteTask: (taskId: string) => void;
}

export default function ViewProjectModal({ 
  onClose, 
  project, 
  handleCreateTask,
  tasks,
  handleUpdateTask,
  handleTaskStatus,
  handleDeleteTask,
}: ViewProjectModalProps) {
 
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();  
    } 
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleEscapeKey);
    return () => {
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [handleEscapeKey]);

  const { userData } = useFormStore();
  const isDarkMode = userData?.theme === 'dark';

  return (
    <div
      className={`fixed inset-0 ${isDarkMode ? 'bg-black/60' : 'bg-black/40'} flex justify-center items-center z-50`}
      onClick={onClose}
    >
      <div
        className={`modal-popup ${isDarkMode ? 'bg-foreground-dark' : 'bg-white'} w-[550px] h-auto rounded-[10px] p-5 shadow-lg flex flex-col gap-5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          <div className="flex flex-row justify-between items-center">
            <h1 className={`${isDarkMode ? 'text-white' : 'text-text'} text-[20px] font-bold font-lato`}>{project.title}</h1>
            <button className="cursor-pointer" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.5 4.50098L4.5 11.501M11.5 11.501L4.5 4.50098L11.5 11.501Z" stroke={isDarkMode ? '#9ca3af' : '#666666'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <h2 className={`${isDarkMode ? 'text-gray-300' : 'text-[#676767]'} text-sm font-lato`}>
            {project.description ? project.description : "View and manage tasks in this project"}
          </h2>
        </div>

        <div className="flex flex-col gap-[10px] max-h-[710px] min-h-[200px] overflow-y-auto scrollbar-hide">
          {tasks.length != 0 ? tasks.map((task, index) => (
            <TaskCard key={index} task={task} handleUpdateTask={handleUpdateTask} handleTaskStatus={handleTaskStatus} handleDeleteTask={handleDeleteTask} />
          )) : (
            <div className="h-full flex items-center justify-center flex-grow">
              <h1 className={`${isDarkMode ? 'text-white' : 'text-text'} text-[20px] font-bold font-lato text-center`}>
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
          
          <button className={`border ${isDarkMode ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-primary-200 text-primary-default hover:bg-gray-50'} 
            rounded-[5px] flex justify-center items-center font-lato text-xs p-[10px] px-4 transition-colors duration-200`} 
            onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: ITask;
  handleUpdateTask: () => void;
  handleTaskStatus: (task: ITask) => void;
  handleDeleteTask: (taskId: string) => void;
}

const TaskCard = ({ task, handleUpdateTask, handleTaskStatus, handleDeleteTask }: TaskCardProps) => {
  const {
    setSelectedTaskData,
    userData
  } = useFormStore();
  const isDarkMode = userData?.theme === 'dark';
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Priority colors for light and dark modes
  const priorityColor = task.priority === "Low" 
    ? isDarkMode ? "bg-green-900/30" : "bg-secondary-200" 
    : task.priority === "Medium" 
      ? isDarkMode ? "bg-yellow-900/30" : "bg-accent-200" 
      : isDarkMode ? "bg-red-900/30" : "bg-error-200";
      
  const priorityTextColor = task.priority === "Low" 
    ? isDarkMode ? "text-green-300" : "text-secondary-500" 
    : task.priority === "Medium" 
      ? isDarkMode ? "text-yellow-300" : "text-accent-500" 
      : isDarkMode ? "text-red-300" : "text-error-500";

  const handleCheckToggle = () => {
    const audio = new Audio('/soundfx/3.mp3'); 
    audio.play();
    const updatedTask = {
      ...task,
      status: task.status === "Complete" ? "Pending" : "Complete",
    };
    handleTaskStatus(updatedTask);
  };

  return (
    <div className={`border ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-[#E0E0E0] bg-white'} rounded-[10px] py-2 px-5 flex flex-row transition-colors duration-200`}>
      <div 
        className="flex flex-row justify-between w-full" 
        onMouseEnter={() => setShowDeleteModal(true)} 
        onMouseLeave={() => setShowDeleteModal(false)}
      >
        <div 
          className="flex flex-row gap-[10px] items-center w-full" 
          onClick={() => {
            setSelectedTaskData(task)
            handleUpdateTask()
          }}
        >
          <div 
            className={`w-[15px] h-[15px] rounded-full mr-4 ${
              task.status === "Complete" 
                ? "bg-success-500" 
                : isDarkMode ? "bg-yellow-500/80" : "bg-[#FFC107]"
            }`}
          />
          <div className="flex flex-col gap-[10px] justify-center items-center w-full">
            <div className="flex flex-row gap-[10px] w-full items-center">
              <h1 
                className={`text-sm font-bold font-lato flex-1 ${
                  task.status === "Complete" 
                    ? `line-through ${isDarkMode ? 'text-gray-400' : 'text-[#828282]'}` 
                    : isDarkMode ? 'text-white' : 'text-text'
                }`}
              >
                {task.title}
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
                isDarkMode ? 'text-gray-300' : 'text-[#676767]'
              }`}>
                {task.description}
              </p>
            )}
          </div>
        </div>

        <div className="h-full flex items-center w-[60px] gap-[10px] justify-end">
          {showDeleteModal && (
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTask(task.task_id);
              }}
            >
              <Image 
                src="/svgs/trash-outline.svg" 
                alt="Delete" 
                width={20} 
                height={20} 
              />
            </div>
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
                isDarkMode ? 'border-gray-600' : 'border-primary-200'
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