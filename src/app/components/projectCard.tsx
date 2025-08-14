import { IProject } from "../interface/IProject";
import { useState } from "react";
import { useFormState } from "@/app/context/FormProvider";
import ConfirmationModal from "./modals/confirmation";
import { Pencil2Icon } from "@radix-ui/react-icons"


export default function ProjectCard({
  project,
  onClick,
  onAddTaskClick,
  onEditClick,
  onDeleteClick,
}: {
  project: IProject & { priority?: 'high' | 'medium' | 'low' | string };
  onClick: () => void;
  onAddTaskClick: () => void;
  onEditClick?: (e: React.MouseEvent) => void;
  onDeleteClick?: (project: IProject) => void;
}) {
  const { userData } = useFormState();
  const projectColor = project.colorLabel?.toLowerCase() || 'gray';

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Helper functions for colors and gradients
const getGradientClass = (color: string = 'gray') => {
  
  const isDarkMode = userData?.theme === 'dark';

  const lightGradients: Record<string, string> = {
    'lavender': 'from-violet-50 to-violet-100',
    'mint': 'from-emerald-50 to-emerald-100',
    'peach': 'from-orange-50 to-orange-100',
    'sky': 'from-sky-50 to-sky-100',
    'lemon': 'from-yellow-50 to-yellow-100',
    'rose': 'from-pink-50 to-pink-100',
    'mauve': 'from-fuchsia-50 to-fuchsia-100',
    'baby blue': 'from-blue-50 to-blue-100',
    'coral': 'from-rose-50 to-rose-100',
    'seafoam': 'from-teal-50 to-teal-100',
  };

  const darkGradients: Record<string, string> = {
    'lavender': 'from-violet-900/30 to-violet-800/30',
    'mint': 'from-emerald-900/30 to-emerald-800/30',
    'peach': 'from-orange-900/30 to-orange-800/30',
    'sky': 'from-sky-900/30 to-sky-800/30',
    'lemon': 'from-yellow-900/30 to-yellow-800/30',
    'rose': 'from-pink-900/30 to-pink-800/30',
    'mauve': 'from-fuchsia-900/30 to-fuchsia-800/30',
    'baby blue': 'from-blue-900/30 to-blue-800/30',
    'coral': 'from-rose-900/30 to-rose-800/30',
    'seafoam': 'from-teal-900/30 to-teal-800/30',
  };

  const gradientMap = isDarkMode ? darkGradients : lightGradients;
  return gradientMap[color.toLowerCase()] || (isDarkMode ? 'from-gray-800/30 to-gray-700/30' : 'from-gray-50 to-gray-100');
  };

  const gradientClass = getGradientClass(projectColor);

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent card click when clicking on action buttons
    if ((e.target as HTMLElement).closest('.action-button')) {
      e.stopPropagation();
      return;
    }
    onClick();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDeleteClick?.(project);
    setShowDeleteConfirm(false);
  };

  const progress = project.task_count 
    ? Math.round(((project.task_completed ?? 0) / project.task_count) * 100) 
    : 0;
  
  const dueDate = project.due_date ? new Date(project.due_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isOverdue = dueDate && daysUntilDue !== null && daysUntilDue < 0;
  const priority = project.priority || 'none';

  return (
    <>
    <div
      onClick={handleCardClick}
      className={`group relative p-5 rounded-2xl bg-gradient-to-br ${gradientClass} 
         shadow-lg hover:shadow-xl transition-all duration-300 
        cursor-pointer overflow-hidden w-full h-full flex flex-col ${
          progress >= 100 
            ? 'shadow-[0_0_20px_5px_rgba(52,211,153,0.3)]' 
            : progress >= 80 
              ? 'shadow-[0_0_15px_3px_rgba(52,211,153,0.2)]' 
              : ''
        }`}
    >
      {/* Simple overlay for completed projects */}
      {progress >= 80 && (
        <div 
          className={`absolute inset-0 rounded-2xl pointer-events-none ${
            progress >= 100 ? 'bg-opacity-30' : progress >= 90 ? 'bg-opacity-20' : 'bg-opacity-10'
          }`}
          style={{
            boxShadow: progress >= 100 
              ? '0 0 40px 20px rgba(52, 211, 153, 0.5)'
              : progress >= 90 
                ? '0 0 30px 10px rgba(52, 211, 153, 0.3)'
                : '0 0 20px 5px rgba(52, 211, 153, 0.2)'
          }}
        />
      )}
      {/* Simple hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/0 group-hover:from-white/5 group-hover:to-white/10 transition-all duration-300" />
      {/* Header with title and menu button */}
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className={`text-lg font-semibold ${userData?.theme === 'dark' ? 'text-white' : 'text-gray-900'} truncate`}>
              {project.title}
            </h2>
            {priority !== 'none' && (
              <span 
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  priority === 'high' 
                    ? userData?.theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800' 
                    : priority === 'medium' 
                      ? userData?.theme === 'dark' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                      : userData?.theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                }`}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </span>
            )}
          </div>
          <p className={`text-sm ${userData?.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} truncate`}>
            {project.description || 'No description'}
          </p>
        </div>

        
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex">
        <button 
            onClick={(e) => {
              e.stopPropagation();
              onEditClick?.(e);
            }}
            className={`text-xs font-medium ${userData?.theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'} transition-colors duration-200 text-blue-400 hover:text-blue-300 z-10`}
            aria-label="Delete project"
          >
            <Pencil2Icon width="18" height="18"/>
          </button>
          
          <button 
            onClick={(e)=>handleDeleteClick(e)}
            className="ml-1 action-button bg-white/10 hover:bg-white/20 transition-colors duration-200 text-red-400 hover:text-red-300 z-10"
            aria-label="Delete project"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Completion Status */}
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <span className={`text-sm font-medium ${userData?.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            {project.task_completed ?? 0} of {project.task_count || 0} tasks completed
            {progress >= 100 && (
              <span className={`ml-2 px-2 py-0.5 text-xs font-semibold ${
                userData?.theme === 'dark' 
                  ? 'text-green-300 bg-green-900/30' 
                  : 'text-green-800 bg-green-100'
              } rounded-full`}>
                Completed!
              </span>
            )}
          </span>
          <span className={`text-xs ${userData?.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {project.due_date ? new Date(project.due_date).toLocaleDateString() : ''}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 mt-3 border-t border-white/10">
        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAddTaskClick();
            }}
            className="relative px-4 py-2 flex flex-row gap-2 items-center justify-center rounded-xl h-[36px] font-medium text-white 
                     bg-gradient-to-r from-primary-default to-primary-200 shadow-sm hover:shadow-md
                     transition-all duration-300 hover:opacity-90 active:opacity-100 overflow-hidden"
          >
            
            {/* Plus icon with subtle animation */}
            <div className="relative z-10 flex items-center justify-center">
              <svg
                width="16"
                height="16"
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
            <span className="relative z-10 text-sm font-medium">Add Task</span>
            
            {/* Subtle shine effect on hover */}
            <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></span>
          </button>
          
          {dueDate && (
            <div 
              className={`flex items-center text-xs px-3 py-1.5 rounded-xl border shadow-sm ${
                isOverdue || daysUntilDue === 0
                  ? 'bg-error-100 text-error-700 border-error-200' 
                  : daysUntilDue === 1
                    ? 'bg-error-100 text-error-700 border-error-200'
                    : daysUntilDue === 3
                      ? 'bg-accent-100 text-accent-700 border-accent-200'
                      : 'bg-white/90 text-gray-800 border-white/30'
              }`}
            >
              <svg 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                className="mr-1.5" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
              {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>
      </div>
    </div>

    {showDeleteConfirm && (
        <div className="absolute inset-0 z-10 rounded-2xl overflow-hidden">
          <ConfirmationModal
          onClose={() => setShowDeleteConfirm(false)}
          title="Delete Project"
          description={`Are you sure you want to delete "${project.title}"? This action cannot be undone.`}
          actions={[
            {
              label: 'Cancel',
              onClick: () => setShowDeleteConfirm(false),
              variant: 'secondary'
            },
            {
              label: 'Delete',
              onClick: confirmDelete,
              variant: 'danger'
            }
          ]}
          fullScreen={true}
        />
        </div>
    )}
    </>
  );
}
